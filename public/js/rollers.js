import { freq, updateScreenFreq } from "./freq.js";

// ─── 3-Digit Drum Roller (Virtual/Windowed — no 40k DOM nodes) ───────────────

const DRUM_H       = 36;
const DRUM_SPAN    = 1000;
const DRUM_VISIBLE = 7;   // small fixed pool of DOM nodes

let drumIdx = freq.left;  // logical 0..999, fractional during drag
let drumDrag = { active: false, startY: 0, startIdx: 0, lastY: 0, lastT: 0, vel: 0 };
let drumItems = [];

function drumWrap(v) {
  return ((v % DRUM_SPAN) + DRUM_SPAN) % DRUM_SPAN;
}

export function buildDrum() {
  const track = document.getElementById("drum-track");
  track.innerHTML = "";
  drumItems = [];
  for (let i = 0; i < DRUM_VISIBLE; i++) {
    const d = document.createElement("div");
    d.className = "drum-item";
    track.appendChild(d);
    drumItems.push(d);
  }
  drumIdx = freq.left;
  drumRenderVirtual(true);
}

function drumRenderVirtual(instant) {
  const half    = Math.floor(DRUM_VISIBLE / 2);
  const ciFloor = Math.floor(drumIdx);
  const frac    = drumIdx - ciFloor;

  for (let slot = 0; slot < DRUM_VISIBLE; slot++) {
    const offset = slot - half;
    const val    = drumWrap(ciFloor + offset);
    const item   = drumItems[slot];
    item.textContent = String(val).padStart(3, "0");
    const dist = Math.abs(offset - frac);
    item.className = "drum-item" + (dist < 0.5 ? " selected" : dist < 1.5 ? " near" : "");
  }

  const track  = document.getElementById("drum-track");
  const roller = document.getElementById("drum-roller");
  const rh     = roller.offsetHeight || 62;
  const y      = rh / 2 - half * DRUM_H - DRUM_H / 2 - frac * DRUM_H;
  track.style.transition = instant ? "none" : "transform 0.13s cubic-bezier(0.22,1,0.36,1)";
  track.style.transform  = `translateY(${y}px)`;

  freq.left = drumWrap(Math.round(drumIdx));
  updateScreenFreq();
}

function drumSnap() {
  drumIdx = drumWrap(Math.round(drumIdx));
  drumRenderVirtual(false);
}

export function initDrum() {
  const roller = document.getElementById("drum-roller");
  let touchActive = false;

  roller.addEventListener("touchstart", (e) => {
    touchActive = true;
    const t = e.touches[0];
    drumDrag = { active: true, startY: t.clientY, startIdx: drumIdx, lastY: t.clientY, lastT: Date.now(), vel: 0 };
    e.preventDefault();
  }, { passive: false });

  roller.addEventListener("touchmove", (e) => {
    if (!drumDrag.active) return;
    const t = e.touches[0], now = Date.now(), dt = Math.max(1, now - drumDrag.lastT);
    drumDrag.vel   = (t.clientY - drumDrag.lastY) / dt;
    drumDrag.lastY = t.clientY;
    drumDrag.lastT = now;
    drumIdx = drumWrap(drumDrag.startIdx + (drumDrag.startY - t.clientY) / DRUM_H);
    drumRenderVirtual(true);
    e.preventDefault();
  }, { passive: false });

  roller.addEventListener("touchend", () => {
    if (!drumDrag.active) return;
    drumDrag.active = false;
    if (Math.abs(drumDrag.vel) > 0.4) drumIdx = drumWrap(drumIdx - drumDrag.vel * 9);
    drumSnap();
    setTimeout(() => { touchActive = false; }, 300);
  });

  roller.addEventListener("mousedown", (e) => {
    if (touchActive) return;
    drumDrag = { active: true, startY: e.clientY, startIdx: drumIdx, lastY: e.clientY, lastT: Date.now(), vel: 0 };
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!drumDrag.active || touchActive) return;
    const now = Date.now(), dt = Math.max(1, now - drumDrag.lastT);
    drumDrag.vel   = (e.clientY - drumDrag.lastY) / dt;
    drumDrag.lastY = e.clientY;
    drumDrag.lastT = now;
    drumIdx = drumWrap(drumDrag.startIdx + (drumDrag.startY - e.clientY) / DRUM_H);
    drumRenderVirtual(true);
  });

  window.addEventListener("mouseup", () => {
    if (!drumDrag.active || touchActive) return;
    drumDrag.active = false;
    if (Math.abs(drumDrag.vel) > 0.4) drumIdx = drumWrap(drumIdx - drumDrag.vel * 9);
    drumSnap();
  });

  roller.addEventListener("wheel", (e) => {
    e.preventDefault();
    drumIdx = drumWrap(drumIdx + (e.deltaY > 0 ? 1 : -1));
    drumSnap();
  }, { passive: false });
}


// ─── Single Digit Rollers (virtualised — 7 nodes each) ───────────────────────

const SGL_H       = 34;
const SGL_VISIBLE = 7;

function buildSingle(trackId, initVal) {
  const track = document.getElementById(trackId);
  track.innerHTML = "";
  const items = [];
  for (let i = 0; i < SGL_VISIBLE; i++) {
    const d = document.createElement("div");
    d.className = "single-item";
    track.appendChild(d);
    items.push(d);
  }
  const state = {
    idx: initVal,
    items,
    drag: { active: false, startY: 0, startIdx: 0, lastY: 0, lastT: 0, vel: 0 },
  };
  sglRenderVirtual(track, trackId, state, true);
  return state;
}

function sglWrap(v) { return ((v % 10) + 10) % 10; }

function sglRenderVirtual(track, trackId, state, instant) {
  const roller  = document.getElementById(trackId.replace("track-", "roller-"));
  const rh      = roller ? roller.offsetHeight || 62 : 62;
  const half    = Math.floor(SGL_VISIBLE / 2);
  const ciFloor = Math.floor(state.idx);
  const frac    = state.idx - ciFloor;

  for (let slot = 0; slot < SGL_VISIBLE; slot++) {
    const offset = slot - half;
    const val    = sglWrap(ciFloor + offset);
    const item   = state.items[slot];
    item.textContent = val;
    const dist = Math.abs(offset - frac);
    item.className = "single-item" + (dist < 0.5 ? " selected" : dist < 1.5 ? " near" : "");
  }

  const y = rh / 2 - half * SGL_H - SGL_H / 2 - frac * SGL_H;
  track.style.transition = instant ? "none" : "transform 0.13s cubic-bezier(0.22,1,0.36,1)";
  track.style.transform  = `translateY(${y}px)`;
}

function sglSnap(track, trackId, state, freqPos) {
  state.idx = sglWrap(Math.round(state.idx));
  sglRenderVirtual(track, trackId, state, false);
  freq.right[freqPos] = state.idx;
  updateScreenFreq();
}

function initSingle(rollerId, trackId, freqPos, state) {
  const roller = document.getElementById(rollerId);
  const track  = document.getElementById(trackId);
  let touchActive = false;

  roller.addEventListener("touchstart", (e) => {
    touchActive = true;
    const t = e.touches[0];
    state.drag = { active: true, startY: t.clientY, startIdx: state.idx, lastY: t.clientY, lastT: Date.now(), vel: 0 };
    e.preventDefault();
  }, { passive: false });

  roller.addEventListener("touchmove", (e) => {
    if (!state.drag.active) return;
    const t = e.touches[0], now = Date.now(), dt = Math.max(1, now - state.drag.lastT);
    state.drag.vel   = (t.clientY - state.drag.lastY) / dt;
    state.drag.lastY = t.clientY;
    state.drag.lastT = now;
    state.idx = sglWrap(state.drag.startIdx + (state.drag.startY - t.clientY) / SGL_H);
    sglRenderVirtual(track, trackId, state, true);
    e.preventDefault();
  }, { passive: false });

  roller.addEventListener("touchend", () => {
    if (!state.drag.active) return;
    state.drag.active = false;
    if (Math.abs(state.drag.vel) > 0.4) state.idx = sglWrap(state.idx - state.drag.vel * 9);
    sglSnap(track, trackId, state, freqPos);
    setTimeout(() => { touchActive = false; }, 300);
  });

  roller.addEventListener("mousedown", (e) => {
    if (touchActive) return;
    state.drag = { active: true, startY: e.clientY, startIdx: state.idx, lastY: e.clientY, lastT: Date.now(), vel: 0 };
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!state.drag.active || touchActive) return;
    const now = Date.now(), dt = Math.max(1, now - state.drag.lastT);
    state.drag.vel   = (e.clientY - state.drag.lastY) / dt;
    state.drag.lastY = e.clientY;
    state.drag.lastT = now;
    state.idx = sglWrap(state.drag.startIdx + (state.drag.startY - e.clientY) / SGL_H);
    sglRenderVirtual(track, trackId, state, true);
  });

  window.addEventListener("mouseup", () => {
    if (!state.drag.active || touchActive) return;
    state.drag.active = false;
    if (Math.abs(state.drag.vel) > 0.4) state.idx = sglWrap(state.idx - state.drag.vel * 9);
    sglSnap(track, trackId, state, freqPos);
  });

  roller.addEventListener("wheel", (e) => {
    e.preventDefault();
    state.idx = sglWrap(state.idx + (e.deltaY > 0 ? 1 : -1));
    sglSnap(track, trackId, state, freqPos);
  }, { passive: false });
}

export const sglStates = [
  buildSingle("track-a", freq.right[0]),
  buildSingle("track-b", freq.right[1]),
];

export function initSingleRollers() {
  initSingle("roller-a", "track-a", 0, sglStates[0]);
  initSingle("roller-b", "track-b", 1, sglStates[1]);
}