import { Navigate, Route, Routes } from "react-router-dom";

import { GuestOnlyRoute, OnboardingRoute, RequireOrganizationRoute } from "@/components/route-guards";
import { AppShell } from "@/components/app-shell";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import OnboardingPage from "@/pages/OnboardingPage";
import DashboardPage from "@/pages/DashboardPage";
import ProdutosPage from "@/pages/produtos/ProdutosPage";
import ClientesPage from "@/pages/clientes/ClientesPage";
import VendasPage from "@/pages/vendas/VendasPage";
import NovaVendaPage from "@/pages/vendas/NovaVendaPage";
import ConfiguracoesPage from "@/pages/ConfiguracoesPage";

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<OnboardingRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      <Route element={<RequireOrganizationRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/produtos" element={<ProdutosPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/vendas" element={<VendasPage />} />
          <Route path="/vendas/nova" element={<NovaVendaPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
