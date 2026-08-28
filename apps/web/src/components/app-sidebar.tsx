import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, Users, ShoppingCart, Settings, LogOut, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/produtos", label: "Produtos", icon: Package, end: false },
  { to: "/clientes", label: "Clientes", icon: Users, end: false },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart, end: false },
  { to: "/configuracoes", label: "Configuracoes", icon: Settings, end: false },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )
          }
        >
          <item.icon className="size-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppSidebar({ organizationName }: { organizationName: string }) {
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar: the fixed sidebar only shows at md+, so small screens get a
          hamburger that opens the same nav as a slide-over. */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
        <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
          <Menu className="size-5" />
        </Button>
        <span className="font-semibold">{organizationName}</span>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 bg-background p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{organizationName}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto flex items-center justify-between border-t pt-4">
              <ThemeToggle />
              <Button type="button" variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r bg-background p-4 md:flex">
        <span className="px-2 text-lg font-semibold">{organizationName}</span>
        <NavLinks />
        <div className="mt-auto flex items-center justify-between border-t pt-4">
          <ThemeToggle />
          <Button type="button" variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>
    </>
  );
}
