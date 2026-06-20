import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { KycProvider } from "@/hooks/use-kyc";
import NotFound from "@/pages/not-found";
import SignIn from "@/pages/sign-in";
import SignUp from "@/pages/sign-up";
import Dashboard from "@/pages/dashboard";
import Trade from "@/pages/trade";
import Convert from "@/pages/convert";
import Market from "@/pages/market";
import Invoice from "@/pages/invoice";
import LinkAccount from "@/pages/link-account";
import Send from "@/pages/send";
import Withdraw from "@/pages/withdraw";
import CashAppGasFee from "@/pages/cashapp-gas-fee";
import ChangePassword from "@/pages/change-password";
import SetPassword from "@/pages/set-password";
import ConnectedAccounts from "@/pages/connected-accounts";
import NotificationSettings from "@/pages/notification-settings";
import ResetPassword from "@/pages/reset-password";
import RefundsLanding from "@/refunds/pages/landing";
import RefundsBrandGuide from "@/refunds/pages/brand-guide";
import RefundsSignIn from "@/refunds/pages/sign-in";
import RefundsSignUp from "@/refunds/pages/sign-up";
import RefundsPortal from "@/refunds/pages/portal";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Redirect to="/sign-in" />;
  }
  return <Component />;
}

function RefundsProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Redirect to="/refunds/sign-in" />;
  }
  return <Component />;
}

function RootRoute() {
  const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const isRefundsHost = host.includes("refunds");
  return <Redirect to={isRefundsHost ? "/refunds" : "/sign-in"} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRoute} />
      <Route path="/sign-in" component={SignIn} />
      <Route path="/sign-up" component={SignUp} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/trade" component={() => <ProtectedRoute component={Trade} />} />
      <Route path="/convert" component={() => <ProtectedRoute component={Convert} />} />
      <Route path="/market" component={() => <ProtectedRoute component={Market} />} />
      <Route path="/invoice" component={() => <ProtectedRoute component={Invoice} />} />
      <Route path="/link-account" component={() => <ProtectedRoute component={LinkAccount} />} />
      <Route path="/send" component={() => <ProtectedRoute component={Send} />} />
      <Route path="/withdraw" component={() => <ProtectedRoute component={Withdraw} />} />
      <Route path="/cashapp-gas-fee" component={() => <ProtectedRoute component={CashAppGasFee} />} />
      <Route path="/change-password" component={() => <ProtectedRoute component={ChangePassword} />} />
      <Route path="/set-password" component={() => <ProtectedRoute component={SetPassword} />} />
      <Route path="/connected-accounts" component={() => <ProtectedRoute component={ConnectedAccounts} />} />
      <Route path="/notification-settings" component={() => <ProtectedRoute component={NotificationSettings} />} />
      <Route path="/refunds" component={RefundsLanding} />
      <Route path="/refunds/brand" component={RefundsBrandGuide} />
      <Route path="/refunds/sign-in" component={RefundsSignIn} />
      <Route path="/refunds/sign-up" component={RefundsSignUp} />
      <Route path="/refunds/portal" component={() => <RefundsProtectedRoute component={RefundsPortal} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <KycProvider>
            <CurrencyProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </CurrencyProvider>
          </KycProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
