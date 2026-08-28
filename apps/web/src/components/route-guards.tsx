import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/lib/auth-context";

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Carregando...
    </div>
  );
}

/** For /login and /signup: bounce away if already signed in. */
export function GuestOnlyRoute() {
  const { session, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (session) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** For /onboarding: needs a session, but bounces to "/" once an org exists. */
export function OnboardingRoute() {
  const { session, organization, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (organization) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** For the app shell: needs a session AND an organization. */
export function RequireOrganizationRoute() {
  const { session, organization, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (!organization) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
