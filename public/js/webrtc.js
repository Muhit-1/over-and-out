import { showToast } from "./ui.js";

// ─── WebRTC ───────────────────────────────────────────────────────────────────

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const peers    = new Map();  // peerId → RTCPeerConnection
const audioMap        = new Map();  // peerId → HTMLAudioElement
export let localStream = null;

let _wsSend = null;
let _userId = null;

export function initWebRTC(wsSendFn, userId) {
  _wsSend = wsSendFn;
  _userId = userId;
}

export function setLocalStream(stream) {
  localStream = stream;
}

export async function createPC(pid, init) {
  if (peers.has(pid)) return peers.get(pid);

  const pc = new RTCPeerConnection(RTC_CONFIG);
  peers.set(pid, pc);

  // Acquire mic early (muted) so both sides include audio tracks before
  // negotiation — this guarantees sendrecv on both ends.
  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.getAudioTracks().forEach((t) => { t.enabled = false; });
    } catch {
      showToast("\u26a0 Microphone access denied", true);
    }
  }

  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }

  // Play remote audio
  pc.ontrack = (e) => {
    let a = audioMap.get(pid);
    if (!a) {
      a = new Audio();
      a.autoplay = true;
      audioMap.set(pid, a);
    }
    a.srcObject = e.streams[0];
  };

  // Relay ICE candidates
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      _wsSend({ type: "ice_candidate", targetId: pid, candidate: e.candidate });
    }
  };

  // Handle renegotiation triggered by addTrack after initial negotiation
  pc.onnegotiationneeded = async () => {
    try {
      const offer = await pc.createOffer();
      if (pc.signalingState !== "stable") return;
      await pc.setLocalDescription(offer);
      _wsSend({ type: "offer", targetId: pid, sdp: pc.localDescription });
    } catch {}
  };

  // Clean up on disconnect
  pc.onconnectionstatechange = () => {
    if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
      pc.close();
      peers.delete(pid);
      const a = audioMap.get(pid);
      if (a) { a.srcObject = null; audioMap.delete(pid); }
    }
  };

  if (init) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    _wsSend({ type: "offer", targetId: pid, sdp: pc.localDescription });
  }

  return pc;
}

export async function handleOffer(msg) {
  const pc = await createPC(msg.senderId, false);
  await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  _wsSend({ type: "answer", targetId: msg.senderId, sdp: pc.localDescription });
}

export async function handleAnswer(msg) {
  const pc = peers.get(msg.senderId);
  if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
}

export async function handleIce(msg) {
  const pc = peers.get(msg.senderId);
  if (pc) {
    try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
  }
}

export async function startTransmit() {
  try {
    if (!localStream) {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      // If we somehow get here without having set up peers yet, mute by default
      localStream.getAudioTracks().forEach((t) => { t.enabled = false; });
    }
    // Simply unmute — tracks are already in every peer connection
    localStream.getAudioTracks().forEach((t) => { t.enabled = true; });
  } catch {
    showToast("\u26a0 Microphone access denied", true);
    _wsSend({ type: "ptt_stop" });
  }
}

export function stopTransmit() {
  if (localStream) {
    localStream.getAudioTracks().forEach((t) => { t.enabled = false; });
  }
}