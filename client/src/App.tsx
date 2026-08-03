import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useRoute } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";

// Lazy-loaded pages (code-split by route)
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const UserDashboard = lazy(() => import("@/pages/user/Dashboard"));
const UserPayments = lazy(() => import("@/pages/user/Payments"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
const AdminCharges = lazy(() => import("@/pages/admin/Charges"));
const AdminConfig = lazy(() => import("@/pages/admin/Config"));
const AdminPaymentReview = lazy(() => import("@/pages/admin/PaymentReview"));
const AdminUserRequests = lazy(() => import("@/pages/admin/UserRequests"));
const AdminApartmentNames = lazy(() => import("@/pages/admin/ApartmentNames"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin w-8 h-8" />
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();
  // useRoute re-renders on route changes (wouter) — critical for SPA navigation
  const [isAuthCallback] = useRoute("/auth/callback");
  const [isRegister] = useRoute("/register");

  // Auth callback page — always accessible, no auth needed
  if (isAuthCallback) {
    return <AuthCallback />;
  }

  // Public register page — always accessible, no auth needed
  if (isRegister) {
    return <Register />;
  }

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Login />;
  }

  // Usuario autenticado - mostrar dashboard según rol
  if (user.role === "admin") {
    return (
      <DashboardLayout>
        <Suspense fallback={<LoadingFallback />}>
          <Switch>
            <Route path={"/"} component={AdminDashboard} />
            <Route path={"/solicitudes"} component={AdminUserRequests} />
            <Route path={"/usuarios"} component={AdminUsers} />
            <Route path={"/apartamentos"} component={AdminApartmentNames} />
            <Route path={"/cobros"} component={AdminCharges} />
            <Route path={"/pagos"} component={AdminPaymentReview} />
            <Route path={"/configuracion"} component={AdminConfig} />
            {/* Admin que también es residente: su vista personal */}
            <Route path={"/mi-apartamento"} component={UserDashboard} />
            <Route path={"/mi-apartamento/pagos"} component={UserPayments} />
            <Route path={"/404"} component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </DashboardLayout>
    );
  }

  // Usuario residente
  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          <Route path={"/"} component={UserDashboard} />
          <Route path={"/pagos"} component={UserPayments} />
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
