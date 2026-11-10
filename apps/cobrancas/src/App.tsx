import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toaster";
import { DataProvider } from "@/data/DataProvider";
import { ChargeProvider } from "@/features/charge/ChargeProvider";
import { PaymentProvider } from "@/features/payments/PaymentProvider";
import { backendMode } from "@/lib/env";
import { ClientDetailPage } from "@/pages/ClientDetailPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { Dashboard } from "@/pages/Dashboard";
import { EditClientPage } from "@/pages/EditClientPage";
import { LoginPage } from "@/pages/LoginPage";
import { MisconfiguredPage } from "@/pages/MisconfiguredPage";
import { NewClientPage } from "@/pages/NewClientPage";
import { NotFound } from "@/pages/NotFound";
import { SetPasswordPage } from "@/pages/SetPasswordPage";

// Guia de identidade visual: só existe em desenvolvimento.
const StyleGuide = import.meta.env.DEV
  ? lazy(() => import("@/pages/StyleGuide").then((m) => ({ default: m.StyleGuide })))
  : null;

function RequireAuth({ children }: { children: ReactNode }) {
  const { status, mustChangePassword } = useAuth();
  const location = useLocation();
  if (status === "loading") return null;
  if (status === "signedOut") return <Navigate to="/entrar" replace state={{ from: location }} />;
  // Senha provisória: nada do sistema fica acessível antes da troca.
  if (mustChangePassword) return <Navigate to="/definir-senha" replace />;
  return <>{children}</>;
}

/** Dados só carregam depois do login. */
function PrivateApp() {
  return (
    <RequireAuth>
      <DataProvider>
        <ChargeProvider>
          <PaymentProvider>
            <AppShell />
          </PaymentProvider>
        </ChargeProvider>
      </DataProvider>
    </RequireAuth>
  );
}

export default function App() {
  if (backendMode === "misconfigured") return <MisconfiguredPage />;

  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/definir-senha" element={<SetPasswordPage />} />
            {StyleGuide && (
              <Route
                path="/identidade"
                element={
                  <Suspense fallback={null}>
                    <StyleGuide />
                  </Suspense>
                }
              />
            )}
            <Route element={<PrivateApp />}>
              <Route index element={<Dashboard />} />
              <Route path="clientes" element={<ClientsPage />} />
              <Route path="clientes/novo" element={<NewClientPage />} />
              <Route path="clientes/:id" element={<ClientDetailPage />} />
              <Route path="clientes/:id/editar" element={<EditClientPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
