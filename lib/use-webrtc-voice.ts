"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket-events";
import type { UserProfile, VoiceStateDTO } from "@/lib/types";

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type SignalPayload =
  | { type: "offer"; description: RTCSessionDescriptionInit }
  | { type: "answer"; description: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit };

type PeerEntry = {
  pc: RTCPeerConnection;
  stream: MediaStream;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  reconnectTimer?: number;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: process.env.NEXT_PUBLIC_RTC_STUN_URL || "stun:stun.l.google.com:19302" }]
};

export function useWebRtcVoice({
  socket,
  roomId,
  userId,
  members,
  voiceStates,
  connected,
  micOn,
  headphonesOn,
  onSpeakingChange
}: {
  socket: RoomSocket | null;
  roomId: string;
  userId: string;
  members: UserProfile[];
  voiceStates: VoiceStateDTO[];
  connected: boolean;
  micOn: boolean;
  headphonesOn: boolean;
  onSpeakingChange: (speaking: boolean) => void;
}) {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [inputDeviceId, setInputDeviceId] = useState<string>("");
  const [outputDeviceId, setOutputDeviceId] = useState<string>("");
  const [localLevel, setLocalLevel] = useState(0);
  const [remoteStreams, setRemoteStreams] = useState<Array<{ userId: string; stream: MediaStream }>>([]);
  const [error, setError] = useState<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, PeerEntry>());
  const speakingRef = useRef(false);
  const reconnectingRef = useRef(new Set<string>());
  const micOnRef = useRef(micOn);
  const headphonesOnRef = useRef(headphonesOn);
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  const connectedPeerIdsRef = useRef<string[]>([]);
  const ensureOfferRef = useRef<(peerId: string) => Promise<void>>(async () => undefined);

  const connectedPeerIds = useMemo(() => {
    const connectedIds = new Set(voiceStates.filter((state) => state.connected && state.headphonesOn).map((state) => state.userId));
    return members.map((member) => member.id).filter((memberId) => memberId !== userId && connectedIds.has(memberId));
  }, [members, userId, voiceStates]);

  useEffect(() => {
    micOnRef.current = micOn;
    headphonesOnRef.current = headphonesOn;
    onSpeakingChangeRef.current = onSpeakingChange;
  }, [headphonesOn, micOn, onSpeakingChange]);

  useEffect(() => {
    connectedPeerIdsRef.current = connectedPeerIds;
  }, [connectedPeerIds]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setInputDevices(devices.filter((device) => device.kind === "audioinput"));
      setOutputDevices(devices.filter((device) => device.kind === "audiooutput"));
    } catch {
      // Device enumeration can be blocked before the user grants microphone permission.
    }
  }, []);

  const closePeer = useCallback((peerId: string) => {
    const entry = peersRef.current.get(peerId);
    if (!entry) return;
    if (entry.reconnectTimer) window.clearTimeout(entry.reconnectTimer);
    entry.pc.getSenders().forEach((sender) => {
      try {
        entry.pc.removeTrack(sender);
      } catch {
        // The sender may already be detached during ICE teardown.
      }
    });
    entry.pc.close();
    peersRef.current.delete(peerId);
    setRemoteStreams((current) => current.filter((item) => item.userId !== peerId));
  }, []);

  const syncLocalStreamToPeer = useCallback((entry: PeerEntry, stream: MediaStream) => {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    const audioSender = entry.pc.getSenders().find((sender) => sender.track?.kind === "audio");
    if (audioSender) {
      void audioSender.replaceTrack(audioTrack);
      return;
    }

    entry.pc.addTrack(audioTrack, stream);
  }, []);

  const flushPendingCandidates = useCallback(async (entry: PeerEntry) => {
    if (!entry.pc.remoteDescription || !entry.pendingCandidates.length) return;
    const candidates = entry.pendingCandidates.splice(0);
    for (const candidate of candidates) {
      await entry.pc.addIceCandidate(candidate);
    }
  }, []);

  const createPeer = useCallback(
    (peerId: string) => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(rtcConfig);
      const stream = new MediaStream();
      const entry: PeerEntry = { pc, stream, makingOffer: false, ignoreOffer: false, pendingCandidates: [] };
      peersRef.current.set(peerId, entry);
      setRemoteStreams((current) => [...current.filter((item) => item.userId !== peerId), { userId: peerId, stream }]);

      if (localStreamRef.current) syncLocalStreamToPeer(entry, localStreamRef.current);

      pc.onnegotiationneeded = () => {
        if (!connected || !localStreamRef.current) return;
        void ensureOfferRef.current(peerId);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit("voice:signal", {
            roomId,
            fromUserId: userId,
            toUserId: peerId,
            signal: { type: "ice", candidate: event.candidate.toJSON() } satisfies SignalPayload
          });
        }
      };

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          if (!stream.getTracks().some((existing) => existing.id === track.id)) stream.addTrack(track);
        });
      };

      pc.oniceconnectionstatechange = () => {
        if (!connected || reconnectingRef.current.has(peerId)) return;
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          reconnectingRef.current.add(peerId);
          entry.reconnectTimer = window.setTimeout(() => {
            reconnectingRef.current.delete(peerId);
            if (pc.iceConnectionState !== "failed" && pc.iceConnectionState !== "disconnected") return;
            closePeer(peerId);
            if (connectedPeerIds.includes(peerId)) void ensureOffer(peerId);
          }, 5000);
        }
      };

      return entry;
    },
    [closePeer, connected, connectedPeerIds, roomId, socket, syncLocalStreamToPeer, userId]
  );

  const ensureOffer = useCallback(
    async (peerId: string) => {
      if (!socket || !connected) return;
      if (!localStreamRef.current) return;
      const entry = createPeer(peerId);
      if (entry.makingOffer || entry.pc.signalingState !== "stable") return;
      entry.makingOffer = true;
      try {
        const offer = await entry.pc.createOffer();
        if (entry.pc.signalingState !== "stable") return;
        await entry.pc.setLocalDescription(offer);
        socket.emit("voice:signal", {
          roomId,
          fromUserId: userId,
          toUserId: peerId,
          signal: { type: "offer", description: entry.pc.localDescription!.toJSON() } satisfies SignalPayload
        });
      } catch {
        // Another peer may have won the offer race. The remote offer handler will settle the connection.
      } finally {
        entry.makingOffer = false;
      }
    },
    [connected, createPeer, roomId, socket, userId]
  );

  useEffect(() => {
    ensureOfferRef.current = ensureOffer;
  }, [ensureOffer]);

  useEffect(() => {
    void refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
  }, [refreshDevices]);

  useEffect(() => {
    if (!connected) {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      peersRef.current.forEach((_, peerId) => closePeer(peerId));
      setLocalLevel(0);
      setError(null);
      return;
    }

    let cancelled = false;
    let frame = 0;
    let lastLevelUpdate = 0;
    let context: AudioContext | null = null;

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          deviceId: inputDeviceId ? { exact: inputDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        setError(null);
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = stream;
        stream.getAudioTracks().forEach((track) => {
          track.enabled = micOnRef.current && headphonesOnRef.current;
        });
        peersRef.current.forEach((entry, peerId) => {
          syncLocalStreamToPeer(entry, stream);
          if (connectedPeerIdsRef.current.includes(peerId)) void ensureOffer(peerId);
        });

        context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(stream).connect(analyser);
        const samples = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(samples);
          const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
          const level = micOnRef.current && headphonesOnRef.current ? Math.min(1, average / 70) : 0;
          const speaking = level > 0.23;
          if (speaking !== speakingRef.current) {
            speakingRef.current = speaking;
            onSpeakingChangeRef.current(speaking);
          }
          const now = performance.now();
          if (now - lastLevelUpdate > 90) {
            setLocalLevel(level);
            lastLevelUpdate = now;
          }
          frame = window.requestAnimationFrame(tick);
        };
        tick();
        void refreshDevices();
      })
      .catch((reason) => {
        const message =
          reason instanceof DOMException && reason.name === "NotAllowedError"
            ? "Разрешите доступ к микрофону в браузере."
            : "Не удалось подключить микрофон. Проверьте устройство ввода.";
        setError(message);
        setLocalLevel(0);
        onSpeakingChangeRef.current(false);
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      void context?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [closePeer, connected, ensureOffer, inputDeviceId, refreshDevices, syncLocalStreamToPeer]);

  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = connected && micOn && headphonesOn;
    });
  }, [connected, headphonesOn, micOn]);

  useEffect(() => {
    if (!socket || !connected) return;
    connectedPeerIds.forEach((peerId) => {
      const hadPeer = peersRef.current.has(peerId);
      createPeer(peerId);
      if (!hadPeer && localStreamRef.current && userId < peerId) void ensureOffer(peerId);
    });
    Array.from(peersRef.current.keys()).forEach((peerId) => {
      if (!connectedPeerIds.includes(peerId)) closePeer(peerId);
    });
  }, [closePeer, connected, connectedPeerIds, createPeer, ensureOffer, socket, userId]);

  useEffect(() => {
    if (!socket || !connected) return;
    const onSignal = async ({ fromUserId, signal }: { roomId: string; fromUserId: string; signal: unknown }) => {
      try {
        const payload = signal as Partial<SignalPayload>;
        const entry = createPeer(fromUserId);
        if (payload.type === "offer" && payload.description) {
          const offerCollision = entry.makingOffer || entry.pc.signalingState !== "stable";
          const polite = userId > fromUserId;
          entry.ignoreOffer = !polite && offerCollision;
          if (entry.ignoreOffer) return;

          if (offerCollision) {
            await entry.pc.setLocalDescription({ type: "rollback" });
          }
          await entry.pc.setRemoteDescription(payload.description);
          await flushPendingCandidates(entry);
          const answer = await entry.pc.createAnswer();
          await entry.pc.setLocalDescription(answer);
          socket.emit("voice:signal", {
            roomId,
            fromUserId: userId,
            toUserId: fromUserId,
            signal: { type: "answer", description: entry.pc.localDescription!.toJSON() } satisfies SignalPayload
          });
        }
        if (payload.type === "answer" && payload.description) {
          if (entry.pc.signalingState === "have-local-offer") {
            await entry.pc.setRemoteDescription(payload.description);
            await flushPendingCandidates(entry);
          }
        }
        if (payload.type === "ice" && payload.candidate) {
          if (entry.ignoreOffer) return;
          if (!entry.pc.remoteDescription) {
            entry.pendingCandidates.push(payload.candidate);
            return;
          }
          await entry.pc.addIceCandidate(payload.candidate);
        }
      } catch {
        // Keep Socket.IO handlers from surfacing WebRTC race conditions as runtime crashes.
      }
    };
    socket.on("voice:signal", onSignal);
    return () => {
      socket.off("voice:signal", onSignal);
    };
  }, [connected, createPeer, flushPendingCandidates, roomId, socket, userId]);

  return {
    inputDevices,
    outputDevices,
    inputDeviceId,
    outputDeviceId,
    localLevel,
    remoteStreams,
    error,
    setInputDeviceId,
    setOutputDeviceId
  };
}
