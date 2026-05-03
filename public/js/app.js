import {
  setStatus, setKnobs, updateUserCount, showToast, statusDot, pttBtn,
} from "./ui.js";
import {
  createPC, handleOffer, handleAnswer, handleIce, startTransmit, stopTransmit, initWebRTC, peers,
} from "./webrtc.js";

// ─── App State ────────────────────────────────────────────────────────────────

export const S = {
  joined: false,
  userId: null,
  channelBusy: false,
  transmitting: false,
  duplexMode: false,
};

let ws        = null;
let pttActive = false;
let pttTouchActive = false;

const duplexBtn    = document.getElementById("duplex-btn");
const antennaSecond = document.getElementById("antenna-second");

export function wsSend(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ─── Message Handler ──────────────────────────────────────────────────────────

async function handleMsg(msg) {
  switch (msg.type) {

    case "joined":
      S.userId = msg.userId;
      S.joined = true;
      updateUserCount(msg.count, msg.max);
      statusDot.classList.add("on");
      setStatus("", "STANDBY");
      pttBtn.disabled = false;
      duplexBtn.disabled = false;
      document.getElementById("landing").classList.add("hidden");
      if (msg.transmitterId) {
        S.channelBusy = true;
        setStatus("busy", "SOMEONE IS TALKING");
        setKnobs(false, true);
      }
      initWebRTC(wsSend, S.userId);
      wsSend({ type: "get_peers" });
      break;

    case "peers":
      for (const pid of msg.peers) {
        if (!peers.has(pid)) await createPC(pid, true);
      }
      break;

    case "user_count":
      updateUserCount(msg.count, msg.max);
      break;

    case "channel_busy":
      S.channelBusy = true;
      if (!S.transmitting && !S.duplexMode) {
        setStatus("busy", "SOMEONE IS TALKING");
        setKnobs(false, true);
      }
      break;

    case "channel_free":
      S.channelBusy = false;
      if (!S.transmitting) {
        setStatus("", S.duplexMode ? "DUPLEX OPEN" : "STANDBY");
        setKnobs(false, false);
      }
      break;

    case "ptt_granted":
      S.transmitting = true;
      setStatus("transmit", "TRANSMITTING");
      setKnobs(true, false);
      await startTransmit();
      break;

    case "ptt_released":
      S.transmitting = false;
      pttActive = false;
      pttTouchActive = false;
      pttBtn.classList.remove("pressing");
      stopTransmit();
      setStatus("", S.duplexMode ? "DUPLEX OPEN" : "STANDBY");
      setKnobs(false, false);
      break;

    case "ptt_denied":
      pttActive = false;
      pttTouchActive = false;
      pttBtn.classList.remove("pressing");
      showToast("⚡ Channel busy — wait for STANDBY", true);
      break;

    case "error":
      showToast(msg.message, true);
      if (msg.code === "FULL") {
        document.getElementById("landing").classList.remove("hidden");
        S.joined = false;
      }
      break;

    case "offer":         await handleOffer(msg);  break;
    case "answer":        await handleAnswer(msg); break;
    case "ice_candidate": await handleIce(msg);    break;
  }
}

// ─── Duplex Toggle ────────────────────────────────────────────────────────────

function toggleDuplex() {
  if (!S.joined) return;
  S.duplexMode = !S.duplexMode;

  duplexBtn.classList.toggle("active", S.duplexMode);
  antennaSecond.classList.toggle("visible", S.duplexMode);

  if (S.duplexMode) {
    // Activate mic continuously — unmute tracks immediately
    startTransmit();
    // PTT becomes unavailable in duplex mode
    pttBtn.disabled = true;
    setStatus("transmit", "DUPLEX OPEN");
    setKnobs(true, false);
    showToast("⇄ Duplex ON — both sides can talk");
  } else {
    // Mute mic, return to PTT mode
    stopTransmit();
    pttBtn.disabled = false;
    if (S.channelBusy) {
      setStatus("busy", "SOMEONE IS TALKING");
      setKnobs(false, true);
    } else {
      setStatus("", "STANDBY");
      setKnobs(false, false);
    }
    showToast("⇄ Duplex OFF — push to talk");
  }
}

// ─── PTT Controls ─────────────────────────────────────────────────────────────

function pttPress() {
  if (!S.joined || pttActive || S.duplexMode) return;
  pttActive = true;
  pttBtn.classList.add("pressing");
  wsSend({ type: "ptt_start" });
}

function pttRelease() {
  if (!S.joined) return;
  if (S.transmitting) wsSend({ type: "ptt_stop" });
  else {
    pttActive = false;
    pttTouchActive = false;
    pttBtn.classList.remove("pressing");
  }
}

export function initPTT() {
  // ── Duplex button ──────────────────────────────────────────────────────────
  duplexBtn.addEventListener("click", toggleDuplex);
  duplexBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    toggleDuplex();
  }, { passive: false });

  // ── Touch events (primary on mobile) ──────────────────────────────────────
  pttBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();           // prevents the ghost mousedown that follows
    pttTouchActive = true;
    pttPress();
  }, { passive: false });

  pttBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    pttRelease();
    // clear flag after a short delay so the ghost mousedown is still blocked
    setTimeout(() => { pttTouchActive = false; }, 300);
  }, { passive: false });

  pttBtn.addEventListener("touchcancel", (e) => {
    e.preventDefault();
    pttRelease();
    setTimeout(() => { pttTouchActive = false; }, 300);
  }, { passive: false });

  // ── Mouse events (desktop — blocked if a touch event just fired) ──────────
  pttBtn.addEventListener("mousedown", (e) => {
    if (pttTouchActive) return;   // ghost event from touch — ignore
    pttPress();
  });

  pttBtn.addEventListener("mouseup", (e) => {
    if (pttTouchActive) return;
    pttRelease();
  });

  pttBtn.addEventListener("mouseleave", () => {
    if (pttTouchActive) return;
    if (pttActive && S.transmitting) pttRelease();
  });

  // ── Keyboard ──────────────────────────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body && !e.repeat) {
      e.preventDefault();
      pttPress();
    }
  });
  document.addEventListener("keyup", (e) => {
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      pttRelease();
    }
  });
}

// ─── WebSocket Connection ─────────────────────────────────────────────────────

export function connectWS() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}`);
  ws.onmessage = async (e) => { await handleMsg(JSON.parse(e.data)); };
  ws.onclose   = () => setTimeout(connectWS, 2000);
}