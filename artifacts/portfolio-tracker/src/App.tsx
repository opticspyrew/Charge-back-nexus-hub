import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import NotFound from "@/pages/not-found";

// Page imports
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import { TransactionsProvider } from "@/hooks/use-transactions";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(155 35% 25%)",
    colorForeground: "hsl(140 10% 12%)",
    colorMutedForeground: "hsl(140 10% 45%)",
    colorDanger: "hsl(0 60% 50%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(140 10% 88%)",
    colorInputForeground: "hsl(140 10% 12%)",
    colorNeutral: "hsl(140 10% 88%)",
    fontFamily: "Plus Jakarta Sans, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg border border-[hsl(140_10%_90%)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(140_10%_12%)] font-bold font-sans",
    headerSubtitle: "text-[hsl(140_10%_45%)] font-sans",
    socialButtonsBlockButtonText: "text-[hsl(140_10%_12%)] font-medium font-sans",
    formFieldLabel: "text-[hsl(140_10%_12%)] font-medium font-sans",
    footerActionLink: "text-[hsl(155_35%_25%)] font-medium hover:opacity-80 font-sans",
    footerActionText: "text-[hsl(140_10%_45%)] font-sans",
    dividerText: "text-[hsl(140_10%_45%)] font-sans",
    identityPreviewEditButton: "text-[hsl(155_35%_25%)]",
    formFieldSuccessText: "text-[hsl(155_35%_25%)]",
    alertText: "text-[hsl(0_60%_50%)]",
    logoBox: "mb-6 flex justify-center",
    logoImage: "h-10",
    socialButtonsBlockButton: "border border-[hsl(140_10%_88%)] hover:bg-[hsl(40_14%_92%)] transition-colors",
    formButtonPrimary: "bg-[hsl(155_35%_25%)] hover:opacity-90 transition-opacity text-white",
    formFieldInput: "border-[hsl(140_10%_88%)] bg-[hsl(40_14%_97%)] text-[hsl(140_10%_12%)]",
    footerAction: "border-t border-[hsl(140_10%_88%)] pt-6 mt-6",
    dividerLine: "bg-[hsl(140_10%_88%)]",
    alert: "border border-[hsl(0_60%_50%)] bg-[hsl(0_60%_50%)/0.1]",
    otpCodeFieldInput: "border-[hsl(140_10%_88%)]",
    formFieldRow: "mb-4",
    main: "p-8",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome to Portfolio Tracker",
            subtitle: "Sign in to access your portfolio",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Start tracking your portfolio performance",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TransactionsProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/transactions"><ProtectedRoute component={Transactions} /></Route>

            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            <Route component={NotFound} />
          </Switch>
        </TransactionsProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
