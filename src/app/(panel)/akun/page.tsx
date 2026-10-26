import { AkunForm } from "@/components/panel/akun-form";

export default function AkunPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Akun</h1>
        <p className="mt-1 text-sm text-panel-muted">Kelola email, sandi, dan data akun LayerUp kamu.</p>
      </header>
      <AkunForm />
    </div>
  );
}
