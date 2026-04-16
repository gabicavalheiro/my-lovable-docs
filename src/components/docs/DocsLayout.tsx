import { DocsHeader } from "./DocsHeader";
import { DocSidebar } from "./DocSidebar";

export function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DocsHeader />
      <div className="flex flex-1 min-h-0">
        <DocSidebar />
        {children}
      </div>
    </div>
  );
}