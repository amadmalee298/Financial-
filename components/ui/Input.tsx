import type { InputHTMLAttributes } from "react";

export function Input({
  label,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id}
        className={`rounded-lg border border-slate-700 bg-primary px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-slate-400 focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
}
