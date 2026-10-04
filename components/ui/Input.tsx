import type { InputHTMLAttributes } from "react";

export type Tone = "light" | "dark";

export const fieldTones: Record<Tone, { label: string; input: string }> = {
  light: {
    label: "text-slate-700",
    input:
      "border-slate-300 bg-white text-primary placeholder:text-slate-400 focus:border-primary read-only:bg-slate-50",
  },
  dark: {
    label: "text-slate-300",
    input:
      "border-slate-700 bg-primary text-white placeholder:text-slate-500 focus:border-slate-400",
  },
};

export const fieldBase =
  "w-full rounded-lg border px-3 py-2.5 focus:outline-none aria-invalid:border-negative";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="text-xs text-negative">
      {message}
    </p>
  );
}

export function Input({
  label,
  id,
  error,
  tone = "light",
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  error?: string;
  tone?: Tone;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={`text-sm font-medium ${fieldTones[tone].label}`}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${fieldBase} ${fieldTones[tone].input} ${className}`}
        {...props}
      />
      <FieldError id={id} message={error} />
    </div>
  );
}
