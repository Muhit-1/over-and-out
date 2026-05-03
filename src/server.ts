import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import path from "path";

import type {
  ClientMessage,
  ServerMessage,
  FrequencyRoom,
} from "./types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const PORT = 3000;
const MAX_USERS_PER_FREQ = 8;

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files from /public
app.use(express.static(path.join(__dirname, "../public")));

// ─── State ────────────────────────────────────────────────────────────────────

const frequencies = new Map<string, FrequencyRoom>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreateRoom(freq: string): FrequencyRoom {
  if (!frequencies.has(freq)) {
    frequencies.set(freq, { users: new Map(), transmitterId: null });
  }
  return frequencies.get(freq)!;
}

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(
  freq: string,
  message: ServerMessage,
  excludeId?: string
): void {
  const room = frequencies.get(freq);
  if (!room) return;

  for (const [id, ws] of room.users) {
    if (id !== excludeId) send(ws, message);
  }
}

function broadcastUserCount(freq: string): void {
  const room = frequencies.get(freq);
  if (!room) return;
  broadcast(freq, { type: "user_count", count: room.users.size, max: MAX_USERS_PER_FREQ });
}

function cleanupRoom(freq: string): void {
  const room = frequencies.get(freq);
  if (room && room.users.size === 0) {
    frequencies.delete(freq);
  }
}

// ─── Connection handler ───────────────────────────────────────────────────────

wss.on("connection", (ws: WebSocket) => {
  const userId = uuidv4();
  let currentFreq: string | null = null;

  ws.on("message", async (raw: WebSocket.RawData) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {

      // ── Join a frequency ──────────────────────────────────────────────────
      case "join": {
        const freq = String(msg.freq).padStart(5, "0");

        // Leave previous room if any
        if (currentFreq) {
          const oldRoom = frequencies.get(currentFreq);
          if (oldRoom) {
            if (oldRoom.transmitterId === userId) {
              oldRoom.transmitterId = null;
              broadcast(currentFreq, { type: "channel_free" });
            }
            oldRoom.users.delete(userId);
            broadcastUserCount(currentFreq);
            cleanupRoom(currentFreq);
          }
        }

        const room = getOrCreateRoom(freq);

        if (room.users.size >= MAX_USERS_PER_FREQ) {
          send(ws, {
            type: "error",
            code: "FULL",
            message: "Frequency is full (8/8). Try another frequency.",
          });
          return;
        }

        currentFreq = freq;
        room.users.set(userId, ws);

        send(ws, {
          type: "joined",
          freq,
          userId,
          count: room.users.size,
          max: MAX_USERS_PER_FREQ,
          transmitterId: room.transmitterId,
        });

        broadcast(freq, { type: "user_count", count: room.users.size, max: MAX_USERS_PER_FREQ }, userId);
        break;
      }

      // ── PTT press — request to transmit ──────────────────────────────────
      case "ptt_start": {
        if (!currentFreq) return;
        const room = frequencies.get(currentFreq);
        if (!room) return;

        if (room.transmitterId === null) {
          room.transmitterId = userId;
          send(ws, { type: "ptt_granted" });
          broadcast(currentFreq, { type: "channel_busy", transmitterId: userId }, userId);
        } else if (room.transmitterId !== userId) {
          send(ws, { type: "ptt_denied", reason: "BUSY" });
        }
        // If already transmitting: ignore
        break;
      }

      // ── PTT release ───────────────────────────────────────────────────────
      case "ptt_stop": {
        if (!currentFreq) return;
        const room = frequencies.get(currentFreq);
        if (!room) return;

        if (room.transmitterId === userId) {
          room.transmitterId = null;
          send(ws, { type: "ptt_released" });
          broadcast(currentFreq, { type: "channel_free" }, userId);
        }
        break;
      }

      // ── WebRTC signaling (relay to target peer) ───────────────────────────
      case "offer":
      case "answer":
      case "ice_candidate": {
        if (!currentFreq) return;
        const room = frequencies.get(currentFreq);
        if (!room) return;

        const targetWs = room.users.get(msg.targetId);
        if (targetWs) {
          send(targetWs, { ...msg, senderId: userId } as ServerMessage);
        }
        break;
      }

      // ── Get peers list (for WebRTC mesh setup) ────────────────────────────
      case "get_peers": {
        if (!currentFreq) return;
        const room = frequencies.get(currentFreq);
        if (!room) return;

        const peers = [...room.users.keys()].filter((id) => id !== userId);
        send(ws, { type: "peers", peers });
        break;
      }
    }
  });

  ws.on("close", () => {
    if (!currentFreq) return;
    const room = frequencies.get(currentFreq);
    if (!room) return;

    if (room.transmitterId === userId) {
      room.transmitterId = null;
      broadcast(currentFreq, { type: "channel_free" });
    }

    room.users.delete(userId);
    broadcast(currentFreq, {
      type: "user_count",
      count: room.users.size,
      max: MAX_USERS_PER_FREQ,
    });
    cleanupRoom(currentFreq);
  });

  ws.on("error", (err: Error) => {
    console.error(`[WS] Error for user ${userId}:`, err.message);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`\n🎙️  Over & Out server running at http://localhost:${PORT}\n`);
});