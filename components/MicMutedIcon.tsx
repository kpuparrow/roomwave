import { Mic } from "lucide-react";

export function MicMutedIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span className={`relative inline-flex ${className}`} aria-hidden>
      <Mic className="h-full w-full" />
      <span className="absolute left-1/2 top-1/2 h-[2px] w-[135%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current" />
    </span>
  );
}
