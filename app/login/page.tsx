"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Headphones, Music2, Radio, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "register" | "reset";

const stars = [
  "left-[7%] top-[25%] h-2 w-2 bg-rose-300/60",
  "left-[16%] top-[78%] h-2.5 w-2.5 bg-white/42",
  "left-[25%] top-[33%] h-1.5 w-1.5 bg-cyan-200/50",
  "left-[38%] top-[11%] h-2 w-2 bg-rose-200/45",
  "left-[49%] top-[22%] h-2.5 w-2.5 bg-white/62",
  "left-[63%] top-[18%] h-1.5 w-1.5 bg-rose-100/55",
  "left-[72%] top-[42%] h-2 w-2 bg-cyan-100/55",
  "left-[82%] top-[75%] h-1.5 w-1.5 bg-white/48",
  "left-[91%] top-[29%] h-2.5 w-2.5 bg-rose-100/45",
  "left-[12%] top-[46%] h-1.5 w-1.5 bg-cyan-200/55",
  "left-[31%] top-[86%] h-2 w-2 bg-rose-200/45",
  "left-[55%] top-[82%] h-1.5 w-1.5 bg-white/50",
  "left-[68%] top-[64%] h-2 w-2 bg-cyan-200/45",
  "left-[88%] top-[52%] h-1.5 w-1.5 bg-rose-100/50"
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("resetToken") ?? "";
  const next = searchParams.get("next");
  const [mode, setMode] = useState<AuthMode>("login");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordRepeat, setResetPasswordRepeat] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isReset = Boolean(resetToken) || mode === "reset";
  const title = isReset ? "Восстановление доступа" : mode === "login" ? "С возвращением!" : "Регистрация";
  const subtitle = isReset
    ? "Вернем доступ к комнатам и медиатеке."
    : mode === "login"
      ? "Войдите в RoomWave, чтобы слушать музыку вместе."
      : "Создайте профиль для совместного прослушивания.";

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
  }

  function validateAuthForm() {
    if (mode === "login") {
      if (!login.trim() || !password) return "Введите логин или почту и пароль.";
      return null;
    }

    if (name.trim().length < 2) return "Имя должно быть минимум 2 символа.";
    if (login.trim().length < 3) return "Логин должен быть минимум 3 символа.";
    if (!email.includes("@")) return "Введите корректную почту.";
    if (password.length < 8) return "Пароль должен быть минимум 8 символов.";
    if (password !== passwordRepeat) return "Пароли не совпадают.";
    return null;
  }

  async function submit() {
    if (mode === "reset") return requestPasswordReset();

    const validationError = validateAuthForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { login, password } : { email, username: login, password, passwordRepeat, name })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error ?? "Не удалось выполнить действие. Проверьте данные.");
        return;
      }
      router.push(next?.startsWith("/") ? next : "/app");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset() {
    const targetEmail = resetEmail.trim() || login.trim();
    if (!targetEmail) {
      setMessage("Введите почту аккаунта.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail })
      });
      const payload = await response.json().catch(() => null);
      setMessage(
        response.ok
          ? `Если почта существует, мы отправили ссылку.${payload?.devToken ? ` Dev token: ${payload.devToken}` : ""}`
          : payload?.error ?? "Не удалось отправить ссылку."
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetPasswordNow() {
    if (resetPassword.length < 8) {
      setMessage("Новый пароль должен быть минимум 8 символов.");
      return;
    }
    if (resetPassword !== resetPasswordRepeat) {
      setMessage("Пароли не совпадают.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: resetPassword, passwordRepeat: resetPasswordRepeat })
      });
      const payload = await response.json().catch(() => null);
      setMessage(response.ok ? "Пароль изменен. Теперь можно войти." : payload?.error ?? "Не удалось поменять пароль.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070b] px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(244,63,94,.32),transparent_22%),radial-gradient(circle_at_78%_34%,rgba(56,189,248,.18),transparent_24%),linear-gradient(115deg,#07070b_0%,#24101c_45%,#102234_100%)]" />
      <div className="absolute left-10 top-10 z-10 flex items-center gap-3 text-lg font-bold">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/18 text-primary">
          <Headphones className="h-5 w-5" />
        </span>
        RoomWave
      </div>

      <div className="pointer-events-none absolute inset-0">
        {stars.map((className, index) => (
          <span key={index} className={`absolute rounded-sm shadow-[0_0_18px_currentColor] ${className}`} />
        ))}
        <div className="absolute left-[4%] top-[34%] h-40 w-40 rounded-full border-[18px] border-white/8 blur-sm" />
        <div className="absolute right-[8%] top-[32%] h-32 w-32 rotate-12 rounded-[2rem] border border-primary/18 bg-primary/6 blur-[2px]" />
        <Sparkles className="absolute bottom-[18%] left-[15%] h-9 w-9 text-primary/45" />
        <Sparkles className="absolute right-[18%] top-[78%] h-12 w-12 text-cyan-100/35" />
      </div>

      <div className="relative z-10 grid min-h-[calc(100vh-64px)] place-items-center">
        <section className="grid w-full max-w-[900px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#1f2026]/88 shadow-2xl shadow-black/40 backdrop-blur-2xl md:grid-cols-[minmax(0,1.25fr)_260px]">
          <div className="p-6 sm:p-8">
            <div className="mb-7 text-center">
              <h1 className="text-2xl font-extrabold tracking-normal text-white">{title}</h1>
              <p className="mt-2 text-sm font-medium text-white/62">{subtitle}</p>
            </div>

            {resetToken ? (
              <div className="grid gap-3">
                <p className="text-sm font-bold text-white">Новый пароль</p>
                <Input className="h-11 border-white/10 bg-[#14151a] text-white" type="password" placeholder="Новый пароль" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} />
                <Input className="h-11 border-white/10 bg-[#14151a] text-white" type="password" placeholder="Повторите пароль" value={resetPasswordRepeat} onChange={(event) => setResetPasswordRepeat(event.target.value)} />
                <Button className="mt-2 h-11 bg-primary text-primary-foreground hover:bg-primary/90" disabled={busy} onClick={resetPasswordNow}>
                  Сменить пароль
                </Button>
              </div>
            ) : mode === "reset" ? (
              <div className="grid gap-4">
                <label className="grid gap-2 text-xs font-bold uppercase tracking-normal text-white/82">
                  Почта аккаунта
                  <Input className="h-11 border-white/10 bg-[#14151a] text-white placeholder:text-white/32" type="email" placeholder="Введите почту" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} />
                </label>
                <Button className="h-11 bg-primary text-primary-foreground hover:bg-primary/90" disabled={busy} onClick={requestPasswordReset}>
                  Отправить ссылку
                </Button>
                <button className="justify-self-start text-sm font-semibold text-primary hover:text-white" onClick={() => switchMode("login")}>
                  Вернуться ко входу
                </button>
              </div>
            ) : mode === "login" ? (
              <div className="space-y-4">
                <label className="grid gap-2 text-xs font-bold uppercase tracking-normal text-white/82">
                  <span>Логин или почта</span>
                  <Input className="h-11 border-white/10 bg-[#14151a] text-white placeholder:text-white/32" value={login} onChange={(event) => setLogin(event.target.value)} />
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase tracking-normal text-white/82">
                  <span>
                    Пароль <span className="text-primary">*</span>
                  </span>
                  <Input className="h-11 border-white/10 bg-[#14151a] text-white placeholder:text-white/32" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                </label>
                <button className="text-sm font-semibold text-primary hover:text-white" onClick={() => switchMode("reset")}>
                  Забыли пароль?
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input className="h-11 border-white/10 bg-[#14151a] text-white placeholder:text-white/38" placeholder="Имя" value={name} onChange={(event) => setName(event.target.value)} />
                <Input className="h-11 border-white/10 bg-[#14151a] text-white placeholder:text-white/38" placeholder="Логин" value={login} onChange={(event) => setLogin(event.target.value)} />
                <Input className="h-11 border-white/10 bg-[#14151a] text-white placeholder:text-white/38" type="email" placeholder="Почта" value={email} onChange={(event) => setEmail(event.target.value)} />
                <Input className="h-11 border-white/10 bg-[#14151a] text-white placeholder:text-white/38" type="password" placeholder="Пароль минимум 8 символов" value={password} onChange={(event) => setPassword(event.target.value)} />
                <Input className="h-11 border-white/10 bg-[#14151a] text-white placeholder:text-white/38" type="password" placeholder="Повторите пароль" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} />
              </div>
            )}

            {message ? <p className="mt-4 rounded-xl bg-red-500/12 px-3 py-2 text-sm text-red-100">{message}</p> : null}

            {!resetToken && mode !== "reset" ? (
              <>
                <Button className="mt-5 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={busy} onClick={submit}>
                  {busy ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
                </Button>

                {mode === "login" ? (
                  <p className="mt-4 text-sm text-white/44">
                    Нужна учетная запись?{" "}
                    <button className="font-semibold text-primary hover:text-white" onClick={() => switchMode("register")}>
                      Зарегистрироваться
                    </button>
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-white/44">
                    Уже есть учетная запись?{" "}
                    <button className="font-semibold text-primary hover:text-white" onClick={() => switchMode("login")}>
                      Войти
                    </button>
                  </p>
                )}
              </>
            ) : null}
          </div>

          <aside className="hidden border-l border-white/8 p-8 text-center md:flex md:flex-col md:items-center md:justify-center">
            <div className="grid h-44 w-44 place-items-center rounded-[1rem] border border-primary/35 bg-primary/[.07] p-5">
              <p className="text-balance text-lg font-extrabold leading-tight text-white">Еще не добавили, но скоро будет!</p>
            </div>
            <h2 className="mt-7 text-2xl font-extrabold leading-tight text-white">Войти другим способом</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-white/58">Скоро здесь появится быстрый вход для музыкальных комнат.</p>
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary">
              <Radio className="h-4 w-4" />
              Live-сессии RoomWave
            </div>
          </aside>
        </section>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 text-xs font-semibold text-white/36">
        <Music2 className="h-4 w-4 text-primary/70" />
        Слушайте вместе, даже когда вы далеко
      </div>
    </main>
  );
}
