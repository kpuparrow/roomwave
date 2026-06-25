"use client";

import { useState } from "react";
import { LogOut, MailCheck, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserProfile } from "@/lib/types";

export function SecuritySettingsForm({ user }: { user: UserProfile }) {
  const router = useRouter();
  const [email, setEmail] = useState(user.email);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const showNewPassword = oldPassword.length > 0;

  async function save() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          oldPassword: oldPassword || undefined,
          newPassword: newPassword || undefined,
          newPasswordRepeat: newPasswordRepeat || undefined
        })
      });
      const payload = await response.json().catch(() => null);

      if (response.ok) {
        setMessage("Безопасность обновлена.");
        setOldPassword("");
        setNewPassword("");
        setNewPasswordRepeat("");
      } else {
        setMessage(payload?.error ?? "Не удалось обновить безопасность.");
      }
    } catch {
      setMessage("Нет соединения с сервером.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail() {
    const response = await fetch("/api/auth/email-verification", { method: "POST" });
    const payload = await response.json().catch(() => null);
    setMessage(response.ok ? `Письмо отправлено.${payload?.devToken ? ` Dev token: ${payload.devToken}` : ""}` : payload?.error ?? "Не удалось отправить письмо.");
  }

  async function logoutAll() {
    await fetch("/api/auth/logout-all", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="glass mt-5 rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-2">
        <Lock className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Безопасность</h2>
      </div>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium">
          Почта
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Старый пароль
          <Input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} placeholder="Введите старый пароль" />
        </label>
        {showNewPassword ? (
          <div className="grid gap-4 rounded-3xl bg-foreground/[.04] p-4">
            <label className="grid gap-2 text-sm font-medium">
              Новый пароль
              <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Повторите новый пароль
              <Input type="password" value={newPasswordRepeat} onChange={(event) => setNewPasswordRepeat(event.target.value)} />
            </label>
          </div>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={busy}>
          {busy ? "Сохраняем..." : "Сохранить безопасность"}
        </Button>
        <Button variant="glass" onClick={verifyEmail}>
          <MailCheck className="h-4 w-4" />
          Подтвердить почту
        </Button>
        <Button variant="glass" onClick={logoutAll}>
          <LogOut className="h-4 w-4" />
          Выйти везде
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}
