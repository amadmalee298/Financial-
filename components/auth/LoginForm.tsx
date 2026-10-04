"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Mode = "signin" | "signup";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [signInState, signInAction, signInPending] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signUpPending] = useActionState<AuthState, FormData>(signUp, {});

  const isSignIn = mode === "signin";
  const state = isSignIn ? signInState : signUpState;
  const pending = isSignIn ? signInPending : signUpPending;

  return (
    <div className="rounded-2xl border border-slate-700 bg-secondary p-6 shadow-xl">
      <div className="mb-6 grid grid-cols-2 rounded-lg bg-primary p-1 text-sm" role="tablist">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-md py-2 font-medium transition-colors ${
              mode === m ? "bg-secondary text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {m === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        ))}
      </div>

      <form action={isSignIn ? signInAction : signUpAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <Input
          id="email"
          name="email"
          type="email"
          label="อีเมล"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="รหัสผ่าน"
          autoComplete={isSignIn ? "current-password" : "new-password"}
          minLength={8}
          required
        />

        {state.error && (
          <p role="alert" className="rounded-lg bg-negative/15 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="rounded-lg bg-positive/15 px-3 py-2 text-sm text-green-300">
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-2">
          {pending ? "กำลังดำเนินการ…" : isSignIn ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
        </Button>
      </form>
    </div>
  );
}
