const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;
const MAX_USERS_PER_FREQ = 8;

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// State
// frequencies[freq] = { users: Map<id, ws>, transmitterId: null }
const frequencies = {};

function getOrCreateFreq(freq) {
  if (!frequencies[freq]) {
    frequencies[freq] = { users: new Map(), transmitterId: null };
  }
  return frequencies[freq];
}

function broadcastToFreq(freq, message, excludeId = null) {
  const room = frequencies[freq];
  if (!room) return;
  const data = JSON.stringify(message);
  for (const [id, ws] of room.users) {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function sendToUser(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function getUserCount(freq) {
  return frequencies[freq] ? frequencies[freq].users.size : 0;
}

function broadcastUserCount(freq) {
  const count = getUserCount(freq);
  broadcastToFreq(freq, { type: "user_count", count, max: MAX_USERS_PER_FREQ });
}

wss.on("connection", (ws) => {
  let userId = uuidv4();
  let currentFreq = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {

      // ── JOIN FREQUENCY ──────────────────────────────────────────────────────
      case "join": {
        const freq = String(msg.freq).padStart(5, "0");

        // Leave old freq if any
        if (currentFreq && frequencies[currentFreq]) {
          const oldRoom = frequencies[currentFreq];
          // Release transmitter lock if this user held it
          if (oldRoom.transmitterId === userId) {
            oldRoom.transmitterId = null;
            broadcastToFreq(currentFreq, { type: "channel_free" });
          }
          oldRoom.users.delete(userId);
          broadcastToFreq(currentFreq, { type: "user_count", count: getUserCount(currentFreq), max: MAX_USERS_PER_FREQ });
          if (oldRoom.users.size === 0) delete frequencies[currentFreq];
        }

        const room = getOrCreateFreq(freq);

        if (room.users.size >= MAX_USERS_PER_FREQ) {
          sendToUser(ws, { type: "error", code: "FULL", message: "Frequency is full (8/8). Try another frequency." });
          return;
        }

        currentFreq = freq;
        room.users.set(userId, ws);

        sendToUser(ws, {
          type: "joined",
          freq,
          userId,
          count: room.users.size,
          max: MAX_USERS_PER_FREQ,
          transmitterId: room.transmitterId,
        });

        broadcastToFreq(freq, { type: "user_count", count: room.users.size, max: MAX_USERS_PER_FREQ }, userId);
        break;
      }

      // ── PTT PRESS (want to transmit) ─────────────────────────────────────
      case "ptt_start": {
        if (!currentFreq) return;
        const room = frequencies[currentFreq];
        if (!room) return;

        if (room.transmitterId === null) {
          // Grant the channel
          room.transmitterId = userId;
          sendToUser(ws, { type: "ptt_granted" });
          broadcastToFreq(currentFreq, { type: "channel_busy", transmitterId: userId }, userId);
        } else if (room.transmitterId === userId) {
          // Already transmitting — ignore
        } else {
          // Busy — deny
          sendToUser(ws, { type: "ptt_denied", reason: "BUSY" });
        }
        break;
      }

      // ── PTT RELEASE ───────────────────────────────────────────────────────
      case "ptt_stop": {
        if (!currentFreq) return;
        const room = frequencies[currentFreq];
        if (!room) return;

        if (room.transmitterId === userId) {
          room.transmitterId = null;
          sendToUser(ws, { type: "ptt_released" });
          broadcastToFreq(currentFreq, { type: "channel_free" }, userId);
        }
        break;
      }

      // ── WEBRTC SIGNALING ──────────────────────────────────────────────────
      case "offer":
      case "answer":
      case "ice_candidate": {
        if (!currentFreq) return;
        const room = frequencies[currentFreq];
        if (!room) return;
        const targetWs = room.users.get(msg.targetId);
        if (targetWs) {
          sendToUser(targetWs, { ...msg, senderId: userId });
        }
        break;
      }

      // ── REQUEST PEER LIST (for WebRTC mesh) ──────────────────────────────
      case "get_peers": {
        if (!currentFreq) return;
        const room = frequencies[currentFreq];
        if (!room) return;
        const peers = [...room.users.keys()].filter((id) => id !== userId);
        sendToUser(ws, { type: "peers", peers });
        break;
      }
    }
  });

  ws.on("close", () => {
    if (!currentFreq || !frequencies[currentFreq]) return;
    const room = frequencies[currentFreq];

    if (room.transmitterId === userId) {
      room.transmitterId = null;
      broadcastToFreq(currentFreq, { type: "channel_free" });
    }

    room.users.delete(userId);
    broadcastToFreq(currentFreq, {
      type: "user_count",
      count: room.users.size,
      max: MAX_USERS_PER_FREQ,
    });

    if (room.users.size === 0) delete frequencies[currentFreq];
  });

  ws.on("error", (err) => {
    console.error("WS error:", err.message);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎙️  Walkie-Talkie server running at http://localhost:${PORT}\n`);
});