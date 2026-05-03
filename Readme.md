# 🎙️ RadioLink — Web Walkie-Talkie

A browser-based walkie-talkie using WebRTC audio and WebSocket signaling.
Half-duplex · 5-digit frequencies · Up to 8 users per channel.

---

## 📁 Project Structure

```
walkie-talkie/
├── server.js          ← Node.js signaling server (WebSocket + Express)
├── package.json       ← Dependencies
├── README.md          ← This file
└── public/
    └── index.html     ← Full walkie-talkie UI (no build step needed)
```

---

## 🚀 Setup in VS Code

### Step 1 — Install dependencies
Open the **integrated terminal** in VS Code (`Ctrl + `` ` ```) and run:

```bash
npm install
```

This installs: `express`, `ws`, `uuid`

### Step 2 — Start the server

```bash
node server.js
```

You should see:
```
🎙️  Walkie-Talkie server running at http://localhost:3000
```

### Step 3 — Open in browser

Go to: **http://localhost:3000**

To test with multiple users, open the same URL in:
- Another browser tab
- Another browser (Chrome + Firefox)
- Another device on the same Wi-Fi network using your local IP (e.g. `http://192.168.1.x:3000`)

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
| `SOMEONE IS TALKING` | Channel is occupied by another user |

---

## ⚠️ Browser Requirements

- Chrome, Edge, or Firefox (Safari works with limitations)
- **Microphone permission** must be granted when prompted
- Works over `localhost` without HTTPS
- For production deployment over the internet, you'll need HTTPS + a TURN server

---

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| No audio heard | Check mic permission in browser address bar |
| "Frequency full" | Max 8 users per frequency — try a different channel |
| Can't connect between devices | Make sure they're on the same network and use your LAN IP |
| WebRTC fails across networks | Needs a TURN server for NAT traversal (not included) |