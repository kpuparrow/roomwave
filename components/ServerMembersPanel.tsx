"use client";

import { Ban, Crown, LogOut, Shield, UserMinus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ToastProvider";
import type { ServerRoleDTO, UserProfile } from "@/lib/types";

type Member = {
  id: string;
  role: ServerRoleDTO;
  user: UserProfile;
};

const roleLabels: Record<ServerRoleDTO, string> = {
  OWNER: "Владелец",
  ADMIN: "Админ",
  DJ: "Диджей",
  MEMBER: "Участник",
  GUEST: "Гость"
};

export function ServerMembersPanel({ serverId, members, currentUserId, canManage }: { serverId: string; members: Member[]; currentUserId: string; canManage: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();

  async function updateRole(userId: string, role: ServerRoleDTO) {
    const response = await fetch(`/api/servers/${serverId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role })
    });
    const payload = await response.json().catch(() => null);
    showToast({ kind: response.ok ? "success" : "error", title: response.ok ? "Роль обновлена" : "Не удалось обновить роль", description: payload?.error });
    router.refresh();
  }

  async function kick(userId: string) {
    if (!window.confirm("Исключить участника с сервера?")) return;
    const response = await fetch(`/api/servers/${serverId}/members?userId=${userId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    showToast({ kind: response.ok ? "success" : "error", title: response.ok ? "Участник исключен" : "Не удалось исключить", description: payload?.error });
    router.refresh();
  }

  async function ban(userId: string) {
    const reason = window.prompt("Причина бана") ?? undefined;
    const response = await fetch(`/api/servers/${serverId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, reason })
    });
    const payload = await response.json().catch(() => null);
    showToast({ kind: response.ok ? "success" : "error", title: response.ok ? "Участник забанен" : "Не удалось забанить", description: payload?.error });
    router.refresh();
  }

  async function leave() {
    if (!window.confirm("Выйти с сервера?")) return;
    const response = await fetch(`/api/servers/${serverId}/members`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      router.push("/app");
      router.refresh();
      return;
    }
    showToast({ kind: "error", title: "Не удалось выйти", description: payload?.error });
  }

  return (
    <section className="glass rounded-[2rem] p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Участники сервера</h2>
        </div>
        <Button size="sm" variant="glass" onClick={leave}>
          <LogOut className="h-4 w-4" />
          Выйти
        </Button>
      </div>
      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-foreground/[.05] p-3">
            <UserAvatar user={member.user} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{member.user.name}</p>
                {member.role === "OWNER" ? <Crown className="h-3.5 w-3.5 text-primary" /> : member.role === "ADMIN" ? <Shield className="h-3.5 w-3.5 text-primary" /> : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">{member.user.status}</p>
            </div>
            {canManage && member.role !== "OWNER" ? (
              <div className="flex items-center gap-1">
                <select className="h-9 rounded-full border border-border bg-background px-2 text-xs" value={member.role} onChange={(event) => updateRole(member.user.id, event.target.value as ServerRoleDTO)}>
                  {(["ADMIN", "DJ", "MEMBER", "GUEST"] as ServerRoleDTO[]).map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
                <Button size="icon" variant="ghost" onClick={() => kick(member.user.id)} aria-label="Исключить">
                  <UserMinus className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => ban(member.user.id)} aria-label="Забанить">
                  <Ban className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <span className="rounded-full bg-foreground/[.06] px-3 py-1 text-xs text-muted-foreground">{roleLabels[member.role]}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
