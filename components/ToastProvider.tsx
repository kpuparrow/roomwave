"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; kind: ToastKind; title: string; description?: string };
type ToastInput = Omit<Toast, "id">;

const ToastContext = createContext<{ showToast: (toast: ToastInput) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [...current, { ...toast, id }].slice(-4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-5 top-20 z-[100] flex w-[min(92vw,360px)] flex-col gap-3">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? XCircle : Info;
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 28, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 28, scale: 0.96 }}
                className="glass rounded-3xl p-4 shadow-xl"
              >
                <div className="flex gap-3">
                  <Icon className={toast.kind === "error" ? "mt-0.5 h-5 w-5 text-destructive" : "mt-0.5 h-5 w-5 text-primary"} />
                  <div className="min-w-0">
                    <p className="font-semibold">{toast.title}</p>
                    {toast.description ? <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p> : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => undefined
    };
  }
  return context;
}
