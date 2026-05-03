# 🎙️ Over & Out — Web Walkie-Talkie

A browser-based walkie-talkie using WebRTC audio and WebSocket signaling.
Half-duplex · 5-digit frequencies · Up to 8 users per channel.

---

## 📁 Project Structure

```
over-and-out/
├── src/
│   ├── server.ts          ← Node.js signaling server (TypeScript)
│   └── types.ts           ← Shared message & state types
├── public/
│   ├── index.html         ← Markup only — no inline CSS or JS
│   ├── css/
│   │   └── style.css      ← All styles
│   └── js/
│       ├── main.js        ← Entry point — boots the app
│       ├── app.js         ← WebSocket, PTT controls, message handler
│       ├── webrtc.js      ← RTCPeerConnection mesh logic
│       ├── rollers.js     ← Drum roller & single-digit roller UI
│       ├── freq.js        ← Frequency state & screen updates
│       └── ui.js          ← Shared UI helpers (toast, knobs, status)
├── dist/                  ← Compiled JS output (git-ignored)
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Setup

### Install dependencies
```bash
npm install
```

### Option A — Run directly with ts-node (dev)
```bash
npm run dev
```

### Option B — Compile then run (production)
```bash
npm run build
npm start
```

You should see:
```
🎙️  Over & Out server running at http://localhost:3000
```

---

## 🎛️ How to Use

1. **Scroll the frequency digits** (mouse wheel or touch drag) to set your 5-digit channel
2. Click **▶ TUNE IN** to join that frequency
3. **Hold PUSH TO TALK** (or hold `Spacebar`) to speak
4. Release to let others talk

### Indicator knobs:
| Knob | Meaning |
|------|---------|
| 🟢 Green (TX) | YOU are transmitting |
| 🔴 Red (BUSY) | Someone else is talking |

### Screen messages:
| Message | Meaning |
|---------|---------|
| `STANDBY` | Channel is free |
| `TRANSMITTING` | You are broadcasting |
| `SOMEONE IS TALKING` | Channel is occupied |

---

## ⚠️ Browser Requirements

- Chrome, Edge, or Firefox (Safari works with limitations)
- **Microphone permission** must be granted when prompted
- Works over `localhost` without HTTPS
- For production over the internet, HTTPS + a TURN server is required

---

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| No audio heard | Check mic permission in browser address bar |
| "Frequency full" | Max 8 users per frequency — try a different channel |
| Can't connect between devices | Ensure same network; use your LAN IP |
| WebRTC fails across networks | Needs a TURN server for NAT traversal (not included) |