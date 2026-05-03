// ─── Shared message types between server and client ───────────────────────────

export interface JoinMessage {
  type: "join";
  freq: string;
}

export interface PttStartMessage {
  type: "ptt_start";
}

export interface PttStopMessage {
  type: "ptt_stop";
}

export interface GetPeersMessage {
  type: "get_peers";
}

export interface OfferMessage {
  type: "offer";
  targetId: string;
  sdp: { type: string; sdp?: string };
}

export interface AnswerMessage {
  type: "answer";
  targetId: string;
  sdp: { type: string; sdp?: string };
}

export interface IceCandidateMessage {
  type: "ice_candidate";
  targetId: string;
  candidate: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null };
}

// Union of all client → server messages
export type ClientMessage =
  | JoinMessage
  | PttStartMessage
  | PttStopMessage
  | GetPeersMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage;

// ─── Server → Client messages ──────────────────────────────────────────────────

export interface JoinedMessage {
  type: "joined";
  freq: string;
  userId: string;
  count: number;
  max: number;
  transmitterId: string | null;
}

export interface UserCountMessage {
  type: "user_count";
  count: number;
  max: number;
}

export interface PeersMessage {
  type: "peers";
  peers: string[];
}

export interface ChannelBusyMessage {
  type: "channel_busy";
  transmitterId: string;
}

export interface ChannelFreeMessage {
  type: "channel_free";
}

export interface PttGrantedMessage {
  type: "ptt_granted";
}

export interface PttReleasedMessage {
  type: "ptt_released";
}

export interface PttDeniedMessage {
  type: "ptt_denied";
  reason: "BUSY";
}

export interface ErrorMessage {
  type: "error";
  code: string;
  message: string;
}

export interface ServerOfferMessage {
  type: "offer";
  senderId: string;
  targetId: string;
  sdp: { type: string; sdp?: string };
}

export interface ServerAnswerMessage {
  type: "answer";
  senderId: string;
  targetId: string;
  sdp: { type: string; sdp?: string };
}

export interface ServerIceCandidateMessage {
  type: "ice_candidate";
  senderId: string;
  targetId: string;
  candidate: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null };
}

export type ServerMessage =
  | JoinedMessage
  | UserCountMessage
  | PeersMessage
  | ChannelBusyMessage
  | ChannelFreeMessage
  | PttGrantedMessage
  | PttReleasedMessage
  | PttDeniedMessage
  | ErrorMessage
  | ServerOfferMessage
  | ServerAnswerMessage
  | ServerIceCandidateMessage;

// ─── Server internal state types ──────────────────────────────────────────────

export interface FrequencyRoom {
  users: Map<string, import("ws").WebSocket>;
  transmitterId: string | null;
}