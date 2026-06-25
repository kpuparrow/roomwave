"use client";

import { Check, ChevronDown, Headphones, Mic, Phone, PhoneOff, VolumeX } from "lucide-react";
import { MicMutedIcon } from "@/components/MicMutedIcon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { playRoomSound } from "@/lib/sfx";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket-events";
import type { UserProfile, VoiceStateDTO } from "@/lib/types";
import { useWebRtcVoice } from "@/lib/use-webrtc-voice";
import { cn } from "@/lib/utils";

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type DeviceMenu = "input" | "output" | null;

export function VoiceControls({
  socket,
  roomId,
  user,
  members,
  voiceStates,
  state
}: {
  socket: RoomSocket | null;
  roomId: string;
  user: UserProfile;
  members: UserProfile[];
  voiceStates: VoiceStateDTO[];
  state: VoiceStateDTO;
}) {
  const [deviceMenu, setDeviceMenu] = useState<DeviceMenu>(null);
  const lastSpeakingRef = useRef(false);

  const updateVoice = useCallback(
    (patch: Partial<Omit<VoiceStateDTO, "userId">>) => {
      socket?.emit("voice:update", { roomId, userId: user.id, patch });
    },
    [roomId, socket, user.id]
  );

  const handleSpeakingChange = useCallback(
    (speaking: boolean) => {
      if (lastSpeakingRef.current === speaking) return;
      lastSpeakingRef.current = speaking;
      updateVoice({ speaking });
    },
    [updateVoice]
  );

  const voice = useWebRtcVoice({
    socket,
    roomId,
    userId: user.id,
    members,
    voiceStates,
    connected: state.connected,
    micOn: state.micOn,
    headphonesOn: state.headphonesOn,
    onSpeakingChange: handleSpeakingChange
  });

  const selectedInputName = useMemo(
    () => voice.inputDevices.find((device) => device.deviceId === voice.inputDeviceId)?.label || "Системный микрофон",
    [voice.inputDeviceId, voice.inputDevices]
  );
  const selectedOutputName = useMemo(
    () => voice.outputDevices.find((device) => device.deviceId === voice.outputDeviceId)?.label || "Системный вывод",
    [voice.outputDeviceId, voice.outputDevices]
  );

  function toggleConnection() {
    playRoomSound(state.connected ? "leave" : "join");
    updateVoice({ connected: !state.connected, micOn: false, speaking: false, headphonesOn: true });
  }

  function toggleMic() {
    playRoomSound("mic");
    updateVoice({ micOn: !state.micOn, speaking: false });
  }

  function toggleHeadphones() {
    playRoomSound("headphones");
    const next = !state.headphonesOn;
    updateVoice({ headphonesOn: next, micOn: next ? state.micOn : false, speaking: false });
  }

  useEffect(() => {
    if (!state.connected && lastSpeakingRef.current) {
      lastSpeakingRef.current = false;
      updateVoice({ speaking: false });
    }
  }, [state.connected, updateVoice]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-voice-dock]")) return;
      setDeviceMenu(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <>
      <div
        data-voice-dock
        className="fixed bottom-4 left-[94px] z-[80] flex h-14 items-center gap-1 rounded-2xl border border-white/15 bg-[#25262c]/92 px-2 py-2 text-white shadow-glass backdrop-blur-2xl dark:border-white/10 max-sm:left-[88px]"
      >
        <button
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/10",
            state.connected ? "text-red-300" : "text-emerald-300"
          )}
          onClick={toggleConnection}
          title={state.connected ? "Отключиться от голоса" : "Подключиться к голосу"}
          aria-label={state.connected ? "Отключиться от голоса" : "Подключиться к голосу"}
        >
          {state.connected ? <PhoneOff className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
        </button>

        <div className="relative flex items-center rounded-xl bg-white/7">
          <button
            className={cn(
              "grid h-10 w-10 place-items-center rounded-l-xl transition",
              state.micOn ? "text-white hover:bg-white/10" : "text-red-300 hover:bg-red-500/15",
              (!state.connected || !state.headphonesOn) && "cursor-not-allowed opacity-45"
            )}
            disabled={!state.connected || !state.headphonesOn}
            onClick={toggleMic}
            title={state.micOn ? "Выключить микрофон" : "Включить микрофон"}
            aria-label={state.micOn ? "Выключить микрофон" : "Включить микрофон"}
          >
            {state.micOn ? <Mic className="h-5 w-5" /> : <MicMutedIcon className="h-5 w-5" />}
          </button>
          <button
            className="grid h-10 w-7 place-items-center rounded-r-xl text-white/70 transition hover:bg-white/10 hover:text-white"
            onClick={() => setDeviceMenu((current) => (current === "input" ? null : "input"))}
            title={`Микрофон: ${selectedInputName}`}
            aria-label="Выбрать микрофон"
          >
            <ChevronDown className={cn("h-4 w-4 transition", deviceMenu === "input" && "rotate-180")} />
          </button>
        </div>

        <div className="relative flex items-center rounded-xl bg-white/7">
          <button
            className={cn(
              "grid h-10 w-10 place-items-center rounded-l-xl transition",
              state.headphonesOn ? "text-white hover:bg-white/10" : "text-red-300 hover:bg-red-500/15",
              !state.connected && "cursor-not-allowed opacity-45"
            )}
            disabled={!state.connected}
            onClick={toggleHeadphones}
            title={state.headphonesOn ? "Выключить наушники" : "Включить наушники"}
            aria-label={state.headphonesOn ? "Выключить наушники" : "Включить наушники"}
          >
            {state.headphonesOn ? <Headphones className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button
            className="grid h-10 w-7 place-items-center rounded-r-xl text-white/70 transition hover:bg-white/10 hover:text-white"
            onClick={() => setDeviceMenu((current) => (current === "output" ? null : "output"))}
            title={`Вывод: ${selectedOutputName}`}
            aria-label="Выбрать устройство вывода"
          >
            <ChevronDown className={cn("h-4 w-4 transition", deviceMenu === "output" && "rotate-180")} />
          </button>
        </div>

        <div className="absolute bottom-1 left-3 right-3 h-1 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${Math.round(voice.localLevel * 100)}%` }} />
        </div>

        {deviceMenu ? (
          <div className="absolute bottom-[calc(100%+10px)] left-0 w-80 rounded-2xl border border-white/10 bg-[#25262c]/96 p-2 shadow-glass backdrop-blur-2xl">
            <p className="px-3 pb-2 pt-1 text-xs font-semibold text-white/55">{deviceMenu === "input" ? "Микрофон" : "Устройство вывода"}</p>
            <DeviceOption
              label={deviceMenu === "input" ? "Системный микрофон" : "Системный вывод"}
              active={(deviceMenu === "input" ? voice.inputDeviceId : voice.outputDeviceId) === ""}
              onClick={() => {
                if (deviceMenu === "input") voice.setInputDeviceId("");
                else voice.setOutputDeviceId("");
                setDeviceMenu(null);
              }}
            />
            {(deviceMenu === "input" ? voice.inputDevices : voice.outputDevices).map((device) => (
              <DeviceOption
                key={device.deviceId}
                label={device.label || (deviceMenu === "input" ? "Микрофон" : "Устройство вывода")}
                active={(deviceMenu === "input" ? voice.inputDeviceId : voice.outputDeviceId) === device.deviceId}
                onClick={() => {
                  if (deviceMenu === "input") voice.setInputDeviceId(device.deviceId);
                  else voice.setOutputDeviceId(device.deviceId);
                  setDeviceMenu(null);
                }}
              />
            ))}
          </div>
        ) : null}

        {!deviceMenu && voice.error ? (
          <div className="absolute bottom-[calc(100%+10px)] left-0 w-80 rounded-2xl border border-red-400/25 bg-red-500/15 px-4 py-3 text-xs font-medium text-red-100 shadow-glass backdrop-blur-2xl">
            {voice.error}
          </div>
        ) : null}
      </div>

      {voice.remoteStreams.map((remote) => (
        <RemoteVoiceAudio key={remote.userId} stream={remote.stream} outputDeviceId={voice.outputDeviceId} muted={!state.headphonesOn || !state.connected} />
      ))}
    </>
  );
}

function DeviceOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/88 transition hover:bg-white/10" onClick={onClick}>
      <span className="min-w-0 truncate">{label}</span>
      {active ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
    </button>
  );
}

function RemoteVoiceAudio({ stream, outputDeviceId, muted }: { stream: MediaStream; outputDeviceId: string; muted: boolean }) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    audio.srcObject = stream;
    const withSink = audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
    if (outputDeviceId && withSink.setSinkId) void withSink.setSinkId(outputDeviceId);
    void audio.play().catch(() => undefined);
  }, [outputDeviceId, stream]);

  return <audio ref={ref} autoPlay playsInline muted={muted} className="hidden" />;
}
