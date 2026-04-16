import { useState, useEffect, KeyboardEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Settings,
  Moon,
  Sun,
  Search,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { useGetWorkspace } from "@workspace/api-client-react";
import { CommandMenu } from "./command-menu";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const { data: workspace } = useGetWorkspace();

  useEffect(() => {
    const down = (e: globalThis.KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!workspace) return null;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <CommandMenu open={cmdOpen} setOpen={setCmdOpen} />
      
      <aside className="w-64 border-r bg-sidebar flex flex-col justify-between">
        <div>
          <div className="h-14 flex items-center px-6 border-b border-sidebar-border">
            <span className="font-semibold text-sidebar-foreground">Relations</span>
          </div>
          <div className="px-3 py-4">
            <button
              onClick={() => setCmdOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground bg-secondary/50 hover:bg-secondary rounded-md border border-transparent hover:border-border transition-colors mb-6"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search...
              </span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>

            <nav className="space-y-1">
              <NavItem href="/" icon={LayoutDashboard} label="Dashboard" active={location === "/"} />
              <NavItem href="/pipeline" icon={KanbanSquare} label="Pipeline" active={location === "/pipeline"} />
              <NavItem href="/contacts" icon={Users} label={workspace.entityLabelPlural || "Contacts"} active={location === "/contacts" || location.startsWith("/contacts/")} />
              <NavItem href="/settings" icon={Settings} label="Settings" active={location === "/settings"} />
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active }: { href: string, icon: any, label: string, active: boolean }) {
  return (
    <Link href={href}>
      <span className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
        <Icon className="w-4 h-4" />
        {label}
      </span>
    </Link>
  );
}
