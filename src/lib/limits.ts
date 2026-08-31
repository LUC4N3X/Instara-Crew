import { db } from "./db";

export type LimitVerdict = {
  allowed: boolean;
  reason?: string;
  waitMs?: number;
};

/**
 * Every limit is opt-out: `0` (or an empty value) disables that specific check,
 * and RATE_LIMITS=off disables all of them at once. Defaults stay conservative.
 */
function num(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export const LIMITS = {
  enabled: () => (process.env.RATE_LIMITS ?? "on").toLowerCase() !== "off",
  perHour: () => num("ACCOUNT_MAX_PER_HOUR", 4),
  perDay: () => num("ACCOUNT_MAX_PER_DAY", 15),
  minGapSec: () => num("ACCOUNT_MIN_GAP_SEC", 45),
  activeFrom: () => num("ACTIVE_HOUR_FROM", 8),
  activeTo: () => num("ACTIVE_HOUR_TO", 23),
};

/** Comments already published by this account inside a rolling window. */
async function postedSince(accountId: string, since: Date) {
  return db.jobItem.count({
    where: { accountId, status: "COMPLETED", postedAt: { gte: since } },
  });
}

/**
 * Rate guard checked before each single comment. With limits disabled the
 * account is always allowed and the run speed is governed only by the
 * per-account delays (minDelaySec / maxDelaySec / cooldownSec).
 */
export async function checkAccountLimits(account: {
  id: string;
  username: string;
  lastPostAt: Date | null;
}): Promise<LimitVerdict> {
  if (!LIMITS.enabled()) return { allowed: true };

  const now = new Date();

  const from = LIMITS.activeFrom();
  const to = LIMITS.activeTo();
  const windowActive = !(from === 0 && to >= 24);
  if (windowActive && (now.getHours() < from || now.getHours() >= to)) {
    return {
      allowed: false,
      reason: `Fuori dalla finestra oraria consentita (${from}:00-${to}:00).`,
    };
  }

  const minGapSec = LIMITS.minGapSec();
  if (minGapSec > 0 && account.lastPostAt) {
    const gapMs = minGapSec * 1000;
    const elapsed = now.getTime() - account.lastPostAt.getTime();
    if (elapsed < gapMs) {
      return {
        allowed: false,
        reason: `Intervallo minimo tra commenti non rispettato per @${account.username}.`,
        waitMs: gapMs - elapsed,
      };
    }
  }

  const perHour = LIMITS.perHour();
  if (perHour > 0) {
    const lastHour = await postedSince(account.id, new Date(now.getTime() - 60 * 60 * 1000));
    if (lastHour >= perHour) {
      return {
        allowed: false,
        reason: `@${account.username}: limite orario raggiunto (${lastHour}/${perHour}).`,
      };
    }
  }

  const perDay = LIMITS.perDay();
  if (perDay > 0) {
    const lastDay = await postedSince(account.id, new Date(now.getTime() - 24 * 60 * 60 * 1000));
    if (lastDay >= perDay) {
      return {
        allowed: false,
        reason: `@${account.username}: limite giornaliero raggiunto (${lastDay}/${perDay}).`,
      };
    }
  }

  return { allowed: true };
}
