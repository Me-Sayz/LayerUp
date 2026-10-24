import { Sidebar } from "@/components/panel/sidebar";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel-root flex h-screen flex-col bg-panel md:flex-row font-sans text-panel-text">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-5 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}