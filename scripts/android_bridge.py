#!/usr/bin/env python3
"""Small uiautomator2 bridge used by Instara Crew's Android runtime.

The bridge intentionally exposes only a narrow, comment-only action surface.
It never accepts arbitrary shell commands from the caller.
"""

from __future__ import annotations

import html
import json
import re
import sys
import time
from typing import Any
from urllib.parse import urlparse

DEFAULT_PACKAGE = "com.instagram.android"
ALLOWED_ACTIONS = {"health", "open_home", "open_target", "stop", "publish"}
SAFE_SERIAL = re.compile(r"^[A-Za-z0-9._:-]+$")
SAFE_PACKAGE = re.compile(r"^[A-Za-z0-9_.]+$")


class BridgeError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def result(ok: bool, **payload: Any) -> dict[str, Any]:
    return {"ok": ok, **payload}


def validate_serial(serial: str) -> str:
    serial = (serial or "").strip()
    if not serial or not SAFE_SERIAL.fullmatch(serial):
        raise BridgeError("DEVICE_UNAVAILABLE", "ADB device serial non valido o mancante.")
    return serial


def validate_package(package: str | None) -> str:
    package = (package or DEFAULT_PACKAGE).strip()
    if not SAFE_PACKAGE.fullmatch(package):
        raise BridgeError("BRIDGE_ERROR", "Android package name non valido.")
    return package


def validate_instagram_url(raw: str) -> str:
    parsed = urlparse(raw)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or not (host == "instagram.com" or host.endswith(".instagram.com")):
        raise BridgeError("NOT_FOUND", "Sono ammessi solo target https su instagram.com.")
    return raw


def connect(serial: str):
    try:
        import uiautomator2 as u2
    except ImportError as exc:
        raise BridgeError(
            "BRIDGE_UNAVAILABLE",
            "uiautomator2 non installato. Esegui: pip install -r requirements-android.txt",
        ) from exc

    try:
        return u2.connect(serial)
    except Exception as exc:
        raise BridgeError("DEVICE_UNAVAILABLE", f"Impossibile collegarsi al device {serial}: {exc}") from exc


def package_installed(device, package: str) -> bool:
    try:
        device.app_info(package)
        return True
    except Exception:
        return False


def current_package(device) -> str | None:
    try:
        current = device.app_current() or {}
        return current.get("package")
    except Exception:
        return None


def hierarchy(device) -> str:
    try:
        return html.unescape(device.dump_hierarchy(compressed=False) or "")
    except Exception as exc:
        raise BridgeError("DEVICE_UNAVAILABLE", f"Impossibile leggere la UI Android: {exc}") from exc


def normalized(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip().casefold()


def hierarchy_has_any(xml: str, needles: list[str]) -> bool:
    haystack = normalized(xml)
    return any(normalized(needle) in haystack for needle in needles)


def assert_session_state(device, package: str) -> None:
    xml = hierarchy(device)
    if hierarchy_has_any(
        xml,
        [
            "log in to instagram",
            "accedi a instagram",
            "forgot password",
            "password dimenticata",
            "login_username",
            "login_password",
            ":id/password",
            ":id/username",
        ],
    ):
        raise BridgeError("NEEDS_LOGIN", "Instagram richiede il login su questo device.")

    if hierarchy_has_any(
        xml,
        [
            "action blocked",
            "azione bloccata",
            "try again later",
            "riprova più tardi",
            "we restrict certain activity",
            "limitiamo determinate attività",
        ],
    ):
        raise BridgeError(
            "ACTION_BLOCKED",
            "Instagram ha bloccato l'azione su questo account. Il run viene interrotto.",
        )

    foreground = current_package(device)
    if foreground and foreground != package:
        raise BridgeError("NOT_FOUND", f"Instagram non è in primo piano (app corrente: {foreground}).")


def selector_candidates(package: str, kind: str) -> list[dict[str, Any]]:
    rid = lambda name: f"{package}:id/{name}"
    if kind == "field":
        return [
            {"resourceId": rid("layout_comment_thread_edittext")},
            {"resourceId": rid("layout_comment_thread_edittext_multiline")},
            {"className": "android.widget.EditText", "descriptionMatches": "(?i).*comment.*"},
            {"className": "android.widget.EditText", "textMatches": "(?i).*comment.*"},
        ]
    if kind == "trigger":
        return [
            {"resourceId": rid("row_feed_button_comment")},
            {"descriptionMatches": "(?i)^(comment|commento|comments|commenti).*$"},
        ]
    if kind == "submit":
        return [
            {"resourceId": rid("layout_comment_thread_post_button_click_area")},
            {"resourceId": rid("layout_comment_thread_post_button_icon")},
            {"textMatches": "(?i)^(post|pubblica)$"},
            {"descriptionMatches": "(?i)^(post|pubblica)$"},
        ]
    if kind == "dismiss":
        return [
            {"textMatches": "(?i)^(not now|non ora|cancel|annulla|close|chiudi)$"},
            {"descriptionMatches": "(?i)^(close|chiudi)$"},
        ]
    raise ValueError(kind)


def first_visible(device, selectors: list[dict[str, Any]], timeout: float = 2.0):
    deadline = time.monotonic() + max(0.0, timeout)
    while time.monotonic() <= deadline:
        for spec in selectors:
            try:
                view = device(**spec)
                if view.exists(timeout=0.15):
                    return view
            except Exception:
                continue
        time.sleep(0.08)
    return None


def dismiss_safe_overlays(device, package: str) -> None:
    for _ in range(2):
        view = first_visible(device, selector_candidates(package, "dismiss"), timeout=0.4)
        if not view:
            return
        try:
            view.click()
            time.sleep(0.35)
        except Exception:
            return


def open_target(device, package: str, url: str) -> None:
    validate_instagram_url(url)
    try:
        device.shell([
            "am",
            "start",
            "-W",
            "-a",
            "android.intent.action.VIEW",
            "-d",
            url,
            "-p",
            package,
        ])
    except Exception as exc:
        raise BridgeError("DEVICE_UNAVAILABLE", f"Impossibile aprire il target nell'app Instagram: {exc}") from exc
    time.sleep(2.0)


def set_comment_text(field, text: str) -> None:
    if not text or not text.strip():
        raise BridgeError("NOT_FOUND", "Il commento è vuoto.")
    try:
        field.click()
        field.clear_text()
        field.set_text(text)
        time.sleep(0.35)
        observed = field.get_text() or ""
    except Exception as exc:
        raise BridgeError("NOT_FOUND", f"Impossibile inserire il commento nella UI: {exc}") from exc

    if normalized(observed) != normalized(text):
        raise BridgeError("UNVERIFIED", f"Testo inserito non verificato (letto: {observed[:80]!r}).")


def publish_comment(device, package: str, url: str, comment: str, dry_run: bool) -> dict[str, Any]:
    if not package_installed(device, package):
        raise BridgeError("DEVICE_UNAVAILABLE", f"Package {package} non installato sul device.")

    open_target(device, package, url)
    dismiss_safe_overlays(device, package)
    assert_session_state(device, package)

    field = first_visible(device, selector_candidates(package, "field"), timeout=1.0)
    if field is None:
        trigger = first_visible(device, selector_candidates(package, "trigger"), timeout=3.0)
        if trigger is not None:
            try:
                trigger.click()
            except Exception as exc:
                raise BridgeError("NOT_FOUND", f"Impossibile aprire i commenti: {exc}") from exc
            time.sleep(0.8)
            assert_session_state(device, package)
            field = first_visible(device, selector_candidates(package, "field"), timeout=4.0)

    if field is None:
        raise BridgeError("NOT_FOUND", "Campo commento non trovato nell'app: post rimosso, commenti disattivati o UI cambiata.")

    set_comment_text(field, comment)

    if dry_run:
        try:
            field.clear_text()
        except Exception:
            pass
        return result(True, code="DRY_RUN", message="Dry-run Android: commento inserito e verificato, nessun invio.")

    submit = first_visible(device, selector_candidates(package, "submit"), timeout=3.0)
    if submit is None:
        try:
            field.clear_text()
        except Exception:
            pass
        raise BridgeError("NOT_FOUND", "Pulsante di pubblicazione commento non trovato nell'app.")

    try:
        submit.click()
    except Exception as exc:
        raise BridgeError("UNVERIFIED", f"Tap sul pulsante Pubblica fallito: {exc}") from exc

    time.sleep(1.5)
    assert_session_state(device, package)

    xml = hierarchy(device)
    text_visible = normalized(comment) in normalized(xml)
    field_after = first_visible(device, selector_candidates(package, "field"), timeout=0.6)
    emptied = False
    if field_after is not None:
        try:
            emptied = not (field_after.get_text() or "").strip()
        except Exception:
            pass

    if not text_visible and not emptied:
        return result(False, code="UNVERIFIED", message="Invio Android eseguito ma il commento non è stato verificato nella UI.")

    return result(True, code="POSTED", message="Commento pubblicato e verificato nell'app Android.")


def handle(payload: dict[str, Any]) -> dict[str, Any]:
    action = str(payload.get("action") or "")
    if action not in ALLOWED_ACTIONS:
        raise BridgeError("BRIDGE_ERROR", f"Azione bridge non consentita: {action!r}")

    serial = validate_serial(str(payload.get("serial") or ""))
    package = validate_package(payload.get("package"))
    device = connect(serial)

    if action == "health":
        installed = package_installed(device, package)
        info = getattr(device, "info", {}) or {}
        return result(
            True,
            serial=serial,
            package=package,
            packageInstalled=installed,
            currentPackage=current_package(device),
            model=info.get("productName") or info.get("product") or info.get("brand"),
            sdk=info.get("sdkInt"),
            width=info.get("displayWidth"),
            height=info.get("displayHeight"),
        )

    if not package_installed(device, package):
        raise BridgeError("DEVICE_UNAVAILABLE", f"Package {package} non installato sul device {serial}.")

    if action == "open_home":
        try:
            device.app_start(package, wait=True, stop=False)
        except Exception as exc:
            raise BridgeError("DEVICE_UNAVAILABLE", f"Impossibile avviare Instagram: {exc}") from exc
        time.sleep(0.8)
        return result(True, message="Instagram aperto sul device Android.")

    if action == "open_target":
        url = validate_instagram_url(str(payload.get("targetUrl") or ""))
        open_target(device, package, url)
        assert_session_state(device, package)
        return result(True, message="Target aperto nell'app Instagram.")

    if action == "stop":
        try:
            device.app_stop(package)
        except Exception as exc:
            raise BridgeError("DEVICE_UNAVAILABLE", f"Impossibile fermare Instagram: {exc}") from exc
        return result(True, message="Instagram arrestato sul device Android.")

    url = validate_instagram_url(str(payload.get("targetUrl") or ""))
    comment = str(payload.get("commentText") or "")
    return publish_comment(device, package, url, comment, bool(payload.get("dryRun", True)))


def selftest() -> int:
    checks: list[tuple[str, bool]] = []
    checks.append(("accept instagram https", validate_instagram_url("https://www.instagram.com/p/ABC/").startswith("https://")))
    try:
        validate_instagram_url("https://instagram.com.evil.test/p/ABC/")
        checks.append(("reject lookalike host", False))
    except BridgeError:
        checks.append(("reject lookalike host", True))
    try:
        validate_instagram_url("http://instagram.com/p/ABC/")
        checks.append(("reject http", False))
    except BridgeError:
        checks.append(("reject http", True))
    checks.append(("safe package", validate_package("com.instagram.android") == DEFAULT_PACKAGE))
    try:
        validate_serial("emulator-5554;rm -rf /")
        checks.append(("reject unsafe serial", False))
    except BridgeError:
        checks.append(("reject unsafe serial", True))
    checks.append(("comment-only action surface", ALLOWED_ACTIONS == {"health", "open_home", "open_target", "stop", "publish"}))

    failed = [name for name, ok in checks if not ok]
    for name, ok in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {name}")
    if failed:
        print(f"{len(failed)} Android bridge self-test(s) failed.", file=sys.stderr)
        return 1
    print("Android bridge self-test OK.")
    return 0


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--selftest":
        return selftest()

    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload, dict):
            raise BridgeError("BRIDGE_ERROR", "Payload JSON non valido.")
        print(json.dumps(handle(payload), ensure_ascii=False))
        return 0
    except BridgeError as exc:
        print(json.dumps(result(False, code=exc.code, error=str(exc)), ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps(result(False, code="BRIDGE_ERROR", error=f"Errore bridge Android: {exc}"), ensure_ascii=False))
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
