import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, Users, ShoppingCart, Settings, LogOut } from "lucide-react";

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

export function AppNav({ organizationName }: { organizationName: string }) {
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <span className="shrink-0 font-semibold">{organizationName}</span>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
        <Button type="button" variant="ghost" size="sm" onClick={() => signOut()}>
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
