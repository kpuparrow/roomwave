"use client";

import { Check, Copy, Save, Share2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ToastProvider";

type ServerSettingsPanelProps = {
  serverId: string;
  initialName: string;
  initialDescription?: string | null;
  initialVisibility?: "PRIVATE" | "PUBLIC";
  initialMood?: string | null;
  initialPublicSession?: boolean;
  initialDjBattleEnabled?: boolean;
  roomCount: number;
  memberCount: number;
  isOwner: boolean;
};

export function ServerSettingsPanel({
  serverId,
  initialName,
  initialDescription,
  initialVisibility = "PRIVATE",
  initialMood,
  initialPublicSession = false,
  initialDjBattleEnabled = false,
  roomCount,
  memberCount,
  isOwner
}: ServerSettingsPanelProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">(initialVisibility);
  const [mood, setMood] = useState(initialMood ?? "");
  const [publicSession, setPublicSession] = useState(initialPublicSession);
  const [djBattleEnabled, setDjBattleEnabled] = useState(initialDjBattleEnabled);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const invitePath = `/invite/${inviteCode ?? serverId}`;
  const [inviteUrl, setInviteUrl] = useState(invitePath);

  useEffect(() => {
    setInviteUrl(`${window.location.origin}${invitePath}`);
  }, [invitePath]);

  async function copyInvite() {
    let nextCode = inviteCode;
    if (!nextCode) {
      const response = await fetch(`/api/servers/${serverId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInHours: 24 * 7 })
      });
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        nextCode = payload.invite.code;
        setInviteCode(nextCode);
      }
    }
    const finalUrl = `${window.location.origin}/invite/${nextCode ?? serverId}`;
    await navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    showToast({ kind: "success", title: "Ссылка скопирована", description: "Ее можно отправить друзьям для входа на сервер." });
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function saveServer() {
    if (!isOwner || !name.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/servers/${serverId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description,
        visibility,
        mood,
        publicSession,
        djBattleEnabled
      })
    });
    setBusy(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      showToast({ kind: "error", title: "Не удалось сохранить сервер", description: payload.error ?? "Проверьте название и попробуйте еще раз." });
      return;
    }

    showToast({ kind: "success", title: "Сервер обновлен" });
    router.refresh();
  }

  async function deleteServer() {
    if (!isOwner) return;
    const ok = window.confirm("Удалить сервер вместе с комнатами и очередями? Это действие нельзя отменить.");
    if (!ok) return;

    setBusy(true);
    const response = await fetch(`/api/servers/${serverId}`, { method: "DELETE" });
    setBusy(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      showToast({ kind: "error", title: "Не удалось удалить сервер", description: payload.error ?? "Попробуйте еще раз." });
      return;
    }

    showToast({ kind: "success", title: "Сервер удален" });
    router.push("/app");
    router.refresh();
  }

  return (
    <section className="glass rounded-[2rem] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Управление</p>
          <h2 className="mt-1 text-2xl font-semibold">Сервер</h2>
        </div>
        <Button variant="glass" onClick={copyInvite}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Приглашение
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-border/70 bg-background/55 p-4">
          <p className="text-2xl font-bold">{roomCount}</p>
          <p className="text-sm text-muted-foreground">комнат</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-background/55 p-4">
          <p className="text-2xl font-bold">{memberCount}</p>
          <p className="text-sm text-muted-foreground">участников</p>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-border/70 bg-background/55 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Share2 className="h-4 w-4 text-primary" />
          Ссылка приглашения
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-foreground/[.06] px-3 py-2 text-sm text-muted-foreground">
          <span className="truncate">{inviteUrl}</span>
        </div>
      </div>

      {isOwner ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="server-name">
              Название сервера
            </label>
            <div className="flex gap-2">
              <Input id="server-name" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveServer()} />
              <Button disabled={busy || !name.trim()} onClick={saveServer}>
                <Save className="h-4 w-4" />
                Сохранить
              </Button>
            </div>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Описание
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Для кого этот сервер и какая музыка здесь играет" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Видимость
              <select className="h-10 rounded-full border border-border bg-background px-3" value={visibility} onChange={(event) => setVisibility(event.target.value as "PRIVATE" | "PUBLIC")}>
                <option value="PRIVATE">Приватный</option>
                <option value="PUBLIC">Публичный</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Настроение
              <Input value={mood} onChange={(event) => setMood(event.target.value)} placeholder="Ночь, хип-хоп, chill" />
            </label>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-2xl bg-foreground/[.05] p-3 text-sm">
            Публичная live-сессия
            <input type="checkbox" checked={publicSession} onChange={(event) => setPublicSession(event.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-2xl bg-foreground/[.05] p-3 text-sm">
            DJ battle режим
            <input type="checkbox" checked={djBattleEnabled} onChange={(event) => setDjBattleEnabled(event.target.checked)} />
          </label>

          <div className="rounded-3xl border border-destructive/25 bg-destructive/8 p-4">
            <p className="font-semibold text-destructive">Опасная зона</p>
            <p className="mt-1 text-sm text-muted-foreground">Удаление сервера удалит его комнаты, очередь и список участников.</p>
            <Button className="mt-3" variant="destructive" disabled={busy} onClick={deleteServer}>
              <Trash2 className="h-4 w-4" />
              Удалить сервер
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">Редактировать сервер может только владелец. Приглашение доступно всем участникам.</p>
      )}
    </section>
  );
}
