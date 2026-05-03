import { buildDrum, initDrum, initSingleRollers } from "./rollers.js";
import { updateScreenFreq, getFreqString } from "./freq.js";
import { showToast } from "./ui.js";
import { connectWS, wsSend, initPTT } from "./app.js";

// ─── Boot ─────────────────────────────────────────────────────────────────────

buildDrum();
initDrum();
initSingleRollers();
updateScreenFreq();
connectWS();
initPTT();

// ─── Tune In ──────────────────────────────────────────────────────────────────

document.getElementById("tune-btn").addEventListener("click", () => {
  const f = getFreqString();
  wsSend({ type: "join", freq: f });
  showToast(`Tuning to ${f.slice(0, 3)}·${f.slice(3)}…`);
});