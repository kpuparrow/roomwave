"use client";

import { useState } from "react";
import { Save, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserProfile } from "@/lib/types";

export function ProfileSettingsForm({ user }: { user: UserProfile }) {
  const [name, setName] = useState(user.name);
  const [status, setStatus] = useState(user.status);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status })
      });
      const payload = await response.json().catch(() => null);
      setMessage(response.ok ? "Профиль сохранен." : payload?.error ?? "Не удалось сохранить профиль.");
    } catch {
      setMessage("Нет соединения с сервером.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file: File) {
    setBusy(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const payload = await response.json().catch(() => null);

      if (response.ok) {
        setAvatarUrl(payload.avatarUrl);
        setMessage("Аватарка обновлена.");
      } else {
        setMessage(payload?.error ?? "Не удалось загрузить аватарку.");
      }
    } catch {
      setMessage("Нет соединения с сервером.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass mt-8 rounded-3xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-3xl bg-foreground/10">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-2xl font-bold">{name.slice(0, 1).toUpperCase()}</div>}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{status || "Без статуса"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Логин: @{user.username ?? "не задан"}</p>
        </div>
      </div>
      <Button asChild variant="glass" className="mb-6">
        <label>
          <UploadCloud className="h-4 w-4" />
          Загрузить аватарку
          <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => event.target.files?.[0] && uploadAvatar(event.target.files[0])} />
        </label>
      </Button>

      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium">
          Никнейм
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Логин
          <Input value={user.username ?? ""} disabled />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Статус
          <Input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Например: слушаю новый альбом" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Почта
          <Input value={user.email} disabled />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={busy || name.trim().length < 2}>
          <Save className="h-4 w-4" />
          {busy ? "Сохраняем..." : "Сохранить"}
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}
