// ─── Frequency State ──────────────────────────────────────────────────────────
// Tracks the currently selected 5-digit frequency (3-digit left + 2-digit right)

export const freq = { left: 148, right: [2, 1] };

export function getFreqString() {
  return String(freq.left).padStart(3, "0") + freq.right.join("");
}

export function updateScreenFreq() {
  document.getElementById("sf-left").textContent = String(freq.left).padStart(3, "0");
  document.getElementById("sf-right").textContent = freq.right.join("");
}