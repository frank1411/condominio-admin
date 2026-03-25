import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import UserDashboard from "./pages/user/Dashboard";
import UserPayments from "./pages/user/Payments";
import AdminUsers from "./pages/admin/Users";
import AdminCharges from "./pages/admin/Charges";
import AdminConfig from "./pages/admin/Config";
import AdminPaymentReview from "./pages/admin/PaymentReview";
import AdminUserRequests from "./pages/admin/UserRequests";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Usuario autenticado - mostrar dashboard según rol
  if (user.role === "admin") {
    return (
      <DashboardLayout>
        <Switch>
          <Route path={"/"} component={AdminDashboard} />
          <Route path={"/solicitudes"} component={AdminUserRequests} />
          <Route path={"/usuarios"} component={AdminUsers} />
          <Route path={"/cobros"} component={AdminCharges} />
          <Route path={"/pagos"} component={AdminPaymentReview} />
          <Route path={"/configuracion"} component={AdminConfig} />
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    );
  }

  // Usuario residente
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={UserDashboard} />
        <Route path={"/pagos"} component={UserPayments} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
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
