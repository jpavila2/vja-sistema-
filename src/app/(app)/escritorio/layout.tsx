import { EscritorioNav } from "@/components/EscritorioNav";

export default function EscritorioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <EscritorioNav />
      {children}
    </div>
  );
}
