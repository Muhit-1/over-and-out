// ─── UI Helpers ───────────────────────────────────────────────────────────────

const knobGreen  = document.getElementById("knob-green");
const knobRed    = document.getElementById("knob-red");
const screenStat = document.getElementById("screen-status");
export const statusDot  = document.getElementById("status-dot");
export const userCount  = document.getElementById("user-count");
export const pttBtn     = document.getElementById("ptt-btn");

export function setStatus(mode, text) {
  screenStat.className = `screen-status${mode ? " " + mode : ""}`;
  screenStat.textContent = text;
}

export function setKnobs(tx, busy) {
  knobGreen.classList.toggle("active", tx);
  knobRed.classList.toggle("active", busy);
}

export function updateUserCount(count, max) {
  userCount.textContent = `${count} / ${max}`;
  userCount.classList.toggle("live", count >= 1);
}

let toastTimer = null;
export function showToast(msg, err = false) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "show" + (err ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ""; }, 3000);
}