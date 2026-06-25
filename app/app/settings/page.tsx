import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import { SecuritySettingsForm } from "@/components/SecuritySettingsForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="flex-1 overflow-y-auto px-4 py-5 md:px-7">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 pr-14">
          <p className="text-sm text-muted-foreground">Профиль</p>
          <h1 className="text-4xl font-bold tracking-normal md:text-5xl">Настройки</h1>
        </div>
        <ProfileSettingsForm user={user} />
        <SecuritySettingsForm user={user} />
        <div className="glass mt-5 rounded-3xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Тема</h2>
              <p className="text-sm text-muted-foreground">Светлое или темное оформление приложения.</p>
            </div>
            <ThemeToggle />
          </div>
          <form action={logout} className="mt-6">
            <Button variant="destructive">
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

async function logout() {
  "use server";
  const { clearSession } = await import("@/lib/auth/session");
  await clearSession();
  redirect("/login");
}
