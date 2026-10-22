"""LayerUp hotkey worker: dengar tombol global, kirim event ke server LayerUp."""
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request

SERVER = os.environ.get("LAYERUP_URL", "http://localhost:3000").rstrip("/")
GAME = "ml"
DEBOUNCE_S = 0.4
POLL_S = 3.0

DEFAULTS = {
    "victory": "ctrl+1",
    "defeat": "ctrl+2",
    "undo": "ctrl+3",
    "match_new": "ctrl+4",
}
LABELS = {
    "victory": "Victory",
    "defeat": "Defeat",
    "undo": "Undo",
    "match_new": "Match baru",
}


def log(msg):
    print(time.strftime("[%H:%M:%S] ") + msg, flush=True)


def normalize(combo):
    return "+".join(p.strip().lower() for p in str(combo).split("+") if p.strip())


def clean_bindings(raw):
    out = {}
    seen = set()
    for action, default in DEFAULTS.items():
        combo = normalize(raw.get(action, default)) if isinstance(raw, dict) else default
        if not combo or combo in seen:
            combo = default
        seen.add(combo)
        out[action] = combo
    return out


def http_json(method, path, body=None, timeout=3):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(SERVER + path, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout) as res:
        raw = res.read()
        return json.loads(raw) if raw else None


def fetch_bindings():
    try:
        state = http_json("GET", "/api/state")
        raw = state["settings"][GAME]["hotkeys"]
    except (urllib.error.URLError, OSError, ValueError, KeyError, TypeError):
        return dict(DEFAULTS)
    return clean_bindings(raw)


def send_event(action):
    try:
        http_json("POST", "/api/events", {"game": GAME, "type": action, "source": "hotkey"})
        return None
    except urllib.error.HTTPError as e:
        return f"server menolak ({e.code})"
    except (urllib.error.URLError, OSError):
        return "server tidak terjangkau"


def send_heartbeat(bindings, offline=False):
    body = {"game": GAME, "hotkeys": bindings}
    if offline:
        body["offline"] = True
    try:
        http_json("POST", "/api/worker", body, timeout=2)
    except (urllib.error.URLError, OSError, ValueError):
        pass


class Worker:
    def __init__(self, kb):
        self.kb = kb
        self.bindings = {}
        self.handles = []
        self.last_press = {}
        self.lock = threading.Lock()

    def press(self, action):
        now = time.monotonic()
        with self.lock:
            if now - self.last_press.get(action, 0) < DEBOUNCE_S:
                return
            self.last_press[action] = now
        threading.Thread(target=self._send, args=(action,), daemon=True).start()

    def _send(self, action):
        err = send_event(action)
        label = LABELS[action]
        if err:
            log(f"{label}: GAGAL, {err}")
        else:
            log(f"{label}: terkirim")

    def apply(self, bindings):
        for h in self.handles:
            try:
                self.kb.remove_hotkey(h)
            except (KeyError, ValueError):
                pass
        self.handles = []
        active = {}
        for action, combo in bindings.items():
            try:
                h = self.kb.add_hotkey(combo, self.press, args=(action,), suppress=True)
            except (ValueError, KeyError) as e:
                log(f"Kombinasi '{combo}' untuk {LABELS[action]} tidak valid: {e}")
                continue
            self.handles.append(h)
            active[action] = combo
        self.bindings = active
        log("Hotkey aktif: " + ", ".join(f"{c} = {LABELS[a]}" for a, c in active.items()))

    def tick(self):
        wanted = fetch_bindings()
        if wanted != self.bindings:
            self.apply(wanted)
        send_heartbeat(self.bindings)


def is_admin():
    if os.name != "nt":
        return True
    try:
        import ctypes
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except (AttributeError, OSError):
        return False


def main():
    try:
        import keyboard
    except ImportError:
        print("Library 'keyboard' belum terpasang. Jalankan: pip install keyboard")
        return 1
    log(f"LayerUp hotkey worker, server {SERVER}")
    if not is_admin():
        log("Catatan: berjalan tanpa admin. Kalau LIVE Studio atau game jalan sebagai admin, "
            "tombol mungkin tidak terbaca. Pakai jalankan-admin.bat.")
    w = Worker(keyboard)
    w.tick()
    log("Tekan Ctrl+C di jendela ini untuk berhenti.")
    try:
        while True:
            time.sleep(POLL_S)
            w.tick()
    except KeyboardInterrupt:
        keyboard.unhook_all()
        send_heartbeat({}, offline=True)
        log("Berhenti.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
