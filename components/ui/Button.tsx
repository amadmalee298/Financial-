"use client";

import type { ButtonHTMLAttributes } from "react";
import { useOnline } from "@/components/pwa/useOnline";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-white text-primary hover:bg-slate-200",
  secondary: "bg-secondary text-white hover:bg-slate-700",
  ghost: "text-slate-300 hover:bg-secondary hover:text-white",
};

/** Submit buttons are disabled offline, because saving needs the server. */
export function Button({
  variant = "primary",
  className = "",
  disabled,
  title,
  type,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const online = useOnline();
  const offlineSubmit = type === "submit" && !online;

  return (
    <button
      type={type}
      disabled={disabled || offlineSubmit}
      title={offlineSubmit ? "ออฟไลน์ — บันทึกไม่ได้" : title}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
