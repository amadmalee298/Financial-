import { Card } from "@/components/ui/Card";

export function ComingSoon({ title, phase, children }: { title: string; phase: number; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card>
        <p className="text-sm text-slate-500">
          ฟีเจอร์นี้จะพัฒนาใน Phase {phase}
        </p>
        {children}
      </Card>
    </div>
  );
}
