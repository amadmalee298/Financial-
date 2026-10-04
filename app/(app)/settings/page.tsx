import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { SpeedCheck } from "@/components/diagnostics/SpeedCheck";
import { InstallCard } from "@/components/pwa/InstallCard";
import { createClient } from "@/lib/supabase/server";
import { formatThaiDate } from "@/lib/utils/date";

export const metadata: Metadata = { title: "ตั้งค่า" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">ตั้งค่า</h1>
      <Card>
        <h2 className="mb-3 font-medium">บัญชี</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-slate-500">อีเมล</dt>
          <dd>{user?.email}</dd>
          <dt className="text-slate-500">สมัครเมื่อ</dt>
          <dd>{user?.created_at ? formatThaiDate(user.created_at) : "-"}</dd>
          <dt className="text-slate-500">สกุลเงินหลัก</dt>
          <dd>THB</dd>
        </dl>
      </Card>
      <SpeedCheck />
      <InstallCard />
    </div>
  );
}
