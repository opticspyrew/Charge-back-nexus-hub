import { useEffect, useState } from "react";
import { socialAuthApi, type ProvidersConfig } from "@/lib/api";

interface Props {
  mode: "signin" | "signup";
  errorCode?: string | null;
}

const SOCIAL_ERROR_MESSAGES: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Please try again.",
  provider_error: "The provider reported an error. Please try again.",
  missing_state: "Your sign-in session expired before you finished. Please try again.",
  exchange_failed: "We couldn't verify your sign-in with the provider. Please try again.",
  email_unverified: "Your provider account doesn't have a verified email. Use a different sign-in method.",
  google_not_configured: "Google sign-in isn't available right now.",
  apple_not_configured: "Apple sign-in isn't available right now.",
  start_failed: "We couldn't start the sign-in flow. Please try again.",
  user_resolve_failed: "Something went wrong creating your account. Please try again.",
  session_failed: "Sign-in succeeded but we couldn't create a session. Please try again.",
  auth_required: "Please sign in before connecting another account.",
};

export default function SocialAuthButtons({ mode, errorCode }: Props) {
  const [config, setConfig] = useState<ProvidersConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    socialAuthApi
      .publicConfig()
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {
        if (!cancelled) setConfig({ google: false, apple: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const verb = mode === "signin" ? "Sign in" : "Sign up";
  const errorText = errorCode ? SOCIAL_ERROR_MESSAGES[errorCode] ?? "Sign-in failed. Please try again." : null;

  if (!config || (!config.google && !config.apple)) {
    return errorText ? (
      <div
        data-testid="social-auth-error"
        className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
      >
        {errorText}
      </div>
    ) : null;
  }

  return (
    <div className="space-y-3">
      {errorText && (
        <div
          data-testid="social-auth-error"
          className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          {errorText}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2">
        {config.google && (
          <a
            href={socialAuthApi.loginUrl("google")}
            data-testid={`${mode}-google`}
            className="w-full py-2.5 bg-card border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-accent/40 transition-colors flex items-center justify-center gap-2"
          >
            <GoogleIcon />
            Continue with Google
          </a>
        )}
        {config.apple && (
          <a
            href={socialAuthApi.loginUrl("apple")}
            data-testid={`${mode}-apple`}
            className="w-full py-2.5 bg-foreground text-background rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <AppleIcon />
            Continue with Apple
          </a>
        )}
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or {verb.toLowerCase()} with email</span>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.32z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.94c-.03-2.78 2.27-4.12 2.37-4.18-1.29-1.89-3.3-2.15-4.02-2.18-1.71-.17-3.34 1.01-4.21 1.01-.87 0-2.21-.99-3.64-.96-1.87.03-3.6 1.09-4.56 2.77-1.95 3.37-.5 8.36 1.4 11.1.93 1.34 2.03 2.84 3.47 2.79 1.4-.06 1.93-.9 3.62-.9 1.69 0 2.17.9 3.64.87 1.5-.03 2.45-1.36 3.37-2.71 1.06-1.55 1.5-3.06 1.52-3.13-.03-.02-2.92-1.12-2.96-4.48zM14.3 4.78c.78-.94 1.3-2.25 1.16-3.55-1.12.04-2.47.74-3.27 1.68-.73.84-1.36 2.16-1.19 3.45 1.25.1 2.52-.64 3.3-1.58z"/>
    </svg>
  );
}
