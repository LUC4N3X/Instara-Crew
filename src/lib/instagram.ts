import { Page } from "playwright";
import { withPage, AccountBrowserOptions } from "./browser";

export type PostOutcome = {
  ok: boolean;
  code: "POSTED" | "DRY_RUN" | "NEEDS_LOGIN" | "ACTION_BLOCKED" | "NOT_FOUND" | "UNVERIFIED";
  message: string;
};

export class InstagramError extends Error {
  code: PostOutcome["code"];
  constructor(code: PostOutcome["code"], message: string) {
    super(message);
    this.code = code;
  }
}

const COMMENT_FIELD = [
  'textarea[aria-label*="comment" i]',
  'textarea[aria-label*="commento" i]',
  'textarea[placeholder*="comment" i]',
  'textarea[placeholder*="commento" i]',
  'textarea[placeholder*="Aggiungi un commento" i]',
  'textarea[placeholder*="Add a comment" i]',
  'form textarea',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"][aria-label*="comment" i]',
  'div[contenteditable="true"][aria-label*="commento" i]',
  'div[contenteditable="true"]',
].join(", ");

const COMMENT_TRIGGER_BUTTONS = [
  'svg[aria-label*="comment" i]',
  'svg[aria-label*="commento" i]',
  'button[aria-label*="comment" i]',
  'button[aria-label*="commento" i]',
  'a[href*="/comments/"]',
  'span:has-text("Aggiungi un commento")',
  'span:has-text("Add a comment")',
  'div[role="button"]:has-text("Aggiungi un commento")',
  'div[role="button"]:has-text("Add a comment")',
].join(", ");

const SUBMIT_BUTTON = [
  'div[role="button"]:has-text("Pubblica")',
  'div[role="button"]:has-text("Post")',
  'button:has-text("Pubblica")',
  'button:has-text("Post")',
  'form button[type="submit"]',
  'button[type="submit"]',
  'span:has-text("Pubblica")',
  'span:has-text("Post")',
].join(", ");

const DISMISS_LABELS = [
  "Consenti tutti i cookie",
  "Allow all cookies",
  "Consenti solo cookie essenziali",
  "Rifiuta cookie facoltativi",
  "Decline optional cookies",
  "Non ora",
  "Not Now",
  "Not now",
  "Chiudi",
  "Close",
  "Annulla",
  "Cancel",
  "Continua su web",
  "Usa il browser",
  "Not in app",
  "Dismiss",
];

function normalize(text: string) {
  return text.toLocaleLowerCase("it-IT").replace(/\s+/g, " ").trim();
}

export function humanDelay(minSec: number, maxSec: number) {
  const min = Math.max(0, minSec);
  const max = Math.max(min, maxSec);
  return Math.round((min + Math.random() * (max - min)) * 1000);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(minMs: number, maxMs: number) {
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}

/**
 * Paced interaction: give the page time to settle and keep the run at human
 * speed instead of firing instant actions at Instagram.
 */
async function settle(page: Page) {
  await page.waitForTimeout(jitter(900, 2200));
  await page.mouse.wheel(0, jitter(120, 380)).catch(() => undefined);
  await page.waitForTimeout(jitter(600, 1800));
}

async function dismissOverlays(page: Page) {
  for (const label of DISMISS_LABELS) {
    const button = page
      .locator(`button:has-text("${label}"), div[role="button"]:has-text("${label}"), span:has-text("${label}")`)
      .first();
    if (await button.isVisible({ timeout: 400 }).catch(() => false)) {
      await button.click({ timeout: 1_500 }).catch(() => undefined);
      await page.waitForTimeout(300);
    }
  }

  // Dismiss generic close icons
  const closeIcon = page.locator('svg[aria-label="Chiudi"], svg[aria-label="Close"]').first();
  if (await closeIcon.isVisible({ timeout: 300 }).catch(() => false)) {
    await closeIcon.click({ timeout: 1_500 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

async function assertLoggedIn(page: Page) {
  if (/\/accounts\/login/i.test(page.url())) {
    throw new InstagramError("NEEDS_LOGIN", "Sessione Instagram scaduta: rifare il login su questo profilo.");
  }
  const loginForm = page.locator('input[name="username"], input[name="password"]').first();
  if (await loginForm.isVisible({ timeout: 1_000 }).catch(() => false)) {
    throw new InstagramError("NEEDS_LOGIN", "Instagram chiede il login su questo profilo.");
  }
}

async function assertNotBlocked(page: Page) {
  const blocked = page
    .locator(
      'text=/Azione bloccata|Action Blocked|Try Again Later|Riprova più tardi|Segnalazione di spam|We restrict certain activity/i'
    )
    .first();
  if (await blocked.isVisible({ timeout: 500 }).catch(() => false)) {
    throw new InstagramError(
      "ACTION_BLOCKED",
      "Instagram ha bloccato l'azione per questo account. Interrompo per sicurezza."
    );
  }
}

async function focusCommentField(page: Page) {
  let field = page.locator(COMMENT_FIELD).first();
  let visible = await field.isVisible({ timeout: 3_000 }).catch(() => false);

  // If not visible initially, on mobile we may need to click the comment trigger icon or "Add a comment" button
  if (!visible) {
    const trigger = page.locator(COMMENT_TRIGGER_BUTTONS).first();
    if (await trigger.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await trigger.click({ timeout: 3_000 }).catch(() => undefined);
      await page.waitForTimeout(600);
      field = page.locator(COMMENT_FIELD).first();
      visible = await field.isVisible({ timeout: 5_000 }).catch(() => false);
    }
  }

  if (!visible) {
    // Final wait
    visible = await field.isVisible({ timeout: 10_000 }).catch(() => false);
  }

  if (!visible) {
    throw new InstagramError(
      "NOT_FOUND",
      "Campo commento non trovato: post rimosso, commenti disattivati o layout Instagram cambiato."
    );
  }

  await field.scrollIntoViewIfNeeded().catch(() => undefined);
  await field.click({ timeout: 5_000 });
  await page.waitForTimeout(300);
  return page.locator(COMMENT_FIELD).first();
}

async function fieldValue(page: Page) {
  return page
    .locator(COMMENT_FIELD)
    .first()
    .evaluate((el) =>
      el instanceof HTMLTextAreaElement ? el.value : (el as HTMLElement).innerText
    )
    .catch(() => "");
}

async function typeComment(page: Page, text: string) {
  // Type word by word with variable pauses: steady machine-gun input is both
  // unrealistic and more likely to trip Instagram's spam heuristics.
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    await page.keyboard.type(i === 0 ? words[i] : ` ${words[i]}`, { delay: jitter(45, 145) });
    if (Math.random() < 0.25) await page.waitForTimeout(jitter(250, 900));
  }
  await page.waitForTimeout(jitter(600, 1600));
  const typed = await fieldValue(page);
  if (normalize(typed) !== normalize(text)) {
    throw new InstagramError(
      "NOT_FOUND",
      `Testo non inserito correttamente nel campo commento (letto: "${typed.slice(0, 60)}").`
    );
  }
}

async function clearField(page: Page) {
  await page.keyboard.press("Control+A").catch(() => undefined);
  await page.keyboard.press("Backspace").catch(() => undefined);
}

async function submitComment(page: Page) {
  const button = page.locator(SUBMIT_BUTTON).first();
  const usable =
    (await button.isVisible({ timeout: 3_000 }).catch(() => false)) &&
    (await button.isEnabled().catch(() => false));

  await page.waitForTimeout(jitter(500, 1500));

  if (usable) {
    await button.click({ timeout: 5_000 });
    return "button";
  }

  await page.keyboard.press("Enter");
  return "enter";
}

async function verifyPosted(page: Page, text: string) {
  const emptied = await page
    .waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        if (!el) return true;
        const value = el instanceof HTMLTextAreaElement ? el.value : (el as HTMLElement).innerText;
        return value.trim().length === 0;
      },
      COMMENT_FIELD,
      { timeout: 20_000 }
    )
    .then(() => true)
    .catch(() => false);

  const visible = await page
    .locator(`span:has-text(${JSON.stringify(text)}), div:has-text(${JSON.stringify(text)})`)
    .first()
    .isVisible({ timeout: 8_000 })
    .catch(() => false);

  return emptied || visible;
}

export async function publishComment(input: {
  profileKey: string;
  targetUrl: string;
  commentText: string;
  dryRun: boolean;
  browserOptions?: AccountBrowserOptions;
}): Promise<PostOutcome> {
  return withPage(
    input.profileKey,
    input.targetUrl,
    async (page) => {
      await dismissOverlays(page);
      await assertLoggedIn(page);
      await assertNotBlocked(page);
      await settle(page);

      await focusCommentField(page);
      await typeComment(page, input.commentText);

      if (input.dryRun) {
        await clearField(page);
        return {
          ok: true,
          code: "DRY_RUN",
          message: "Dry-run: commento digitato e verificato, nessun invio.",
        } as PostOutcome;
      }

      const method = await submitComment(page);
      await page.waitForTimeout(1_500);
      await assertNotBlocked(page);

      const posted = await verifyPosted(page, input.commentText);
      if (!posted) {
        return {
          ok: false,
          code: "UNVERIFIED",
          message: `Invio tentato (${method}) ma pubblicazione non verificata.`,
        } as PostOutcome;
      }

      return { ok: true, code: "POSTED", message: `Commento pubblicato (${method}).` } as PostOutcome;
    },
    input.browserOptions
  );
}
