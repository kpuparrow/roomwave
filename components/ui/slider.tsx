"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root ref={ref} className={cn("relative flex w-full touch-none select-none items-center py-1.5", className)} {...props}>
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-foreground/18 shadow-[inset_0_0_0_1px_rgba(255,255,255,.16)] dark:bg-white/18">
      <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-white/70 bg-white shadow-[0_4px_18px_rgba(0,0,0,.25)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-foreground" />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
