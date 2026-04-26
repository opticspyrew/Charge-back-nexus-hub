import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import {
  LoginLockoutError,
  formatRemaining,
  getLockoutState,
  subscribe,
} from "@/lib/login-throttle";
import { getPasswordStrengthHint, validatePassword } from "@/lib/password-policy";

type ForgotStep = "email" | "newPassword" | "done";

export default function SignIn() {
  const [, navigate] = useLocation();
  const { login, resetPassword, accountExists } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [lockMsRemaining, setLockMsRemaining] = useState(0);

  const forgotStrengthHint = useMemo(
    () => getPasswordStrengthHint(forgotPassword),
    [forgotPassword],
  );

  const closeForgot = () => {
    setShowForgot(false);
    setForgotStep("email");
    setForgotEmail("");
    setForgotPassword("");
    setForgotConfirm("");
    setForgotError("");
  };

  useEffect(() => {
    const refresh = () => {
      const { msRemaining } = getLockoutState(form.email);
      setLockMsRemaining(msRemaining);
    };
    refresh();
    const tick = window.setInterval(refresh, 500);
    const unsubscribe = subscribe(refresh);
    return () => {
      window.clearInterval(tick);
      unsubscribe();
    };
  }, [form.email]);

  const isLocked = lockMsRemaining > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    if (isLocked) {
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof LoginLockoutError) {
        setLockMsRemaining(err.msRemaining);
      } else {
        const fresh = getLockoutState(form.email);
        if (fresh.locked) {
          setLockMsRemaining(fresh.msRemaining);
        } else {
          setError("Invalid email or password.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    const trimmed = forgotEmail.trim();
    if (!trimmed) {
      setForgotError("Please enter the email address for your account.");
      return;
    }
    setForgotLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      if (!accountExists(trimmed)) {
        setForgotError("We couldn't find an account with that email address.");
        return;
      }
      setForgotStep("newPassword");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    if (!forgotPassword || !forgotConfirm) {
      setForgotError("Please fill in both password fields.");
      return;
    }
    if (forgotPassword !== forgotConfirm) {
      setForgotError("Passwords do not match.");
      return;
    }
    const policy = validatePassword(forgotPassword);
    if (!policy.ok) {
      setForgotError(policy.error ?? "Please choose a stronger password.");
      return;
    }

    setForgotLoading(true);
    try {
      await resetPassword(forgotEmail, forgotPassword);
      setForgotStep("done");
    } catch (err) {
      setForgotError(
        err instanceof Error ? err.message : "Failed to reset password. Please try again.",
      );
    } finally {
      setForgotLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold text-foreground">CryptoVault</span>
          </div>

          <div className="bg-card border border-card-border rounded-2xl p-8">
            {forgotStep === "done" ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Password updated</h2>
                <p className="text-muted-foreground mb-6">
                  You can now sign in to{" "}
                  <strong className="text-foreground">{forgotEmail}</strong> with your new password.
                </p>
                <button
                  onClick={closeForgot}
                  data-testid="forgot-back-to-signin"
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={
                    forgotStep === "newPassword"
                      ? () => {
                          setForgotStep("email");
                          setForgotError("");
                        }
                      : closeForgot
                  }
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {forgotStep === "newPassword" ? "Back" : "Back to Sign In"}
                </button>

                {forgotStep === "email" ? (
                  <>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Reset password</h2>
                    <p className="text-muted-foreground mb-6 text-sm">
                      Enter the email address for your account.
                    </p>
                    <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Email address
                        </label>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="you@example.com"
                          data-testid="forgot-email-input"
                          className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          required
                        />
                      </div>

                      {forgotError && (
                        <div
                          data-testid="forgot-error"
                          className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                        >
                          {forgotError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        data-testid="forgot-continue"
                        className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                      >
                        {forgotLoading ? "Checking..." : "Continue"}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Set a new password</h2>
                    <p className="text-muted-foreground mb-6 text-sm">
                      Resetting password for{" "}
                      <strong className="text-foreground">{forgotEmail}</strong>.
                    </p>
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          New password
                        </label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={forgotPassword}
                          onChange={(e) => setForgotPassword(e.target.value)}
                          placeholder="Min. 8 chars, mix letters & numbers"
                          aria-describedby="forgot-strength-hint"
                          data-testid="forgot-new-password"
                          className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                        {forgotStrengthHint ? (
                          <p
                            id="forgot-strength-hint"
                            data-testid="forgot-strength-hint"
                            className={
                              "mt-1.5 text-xs " +
                              (forgotStrengthHint.level === "strong"
                                ? "text-emerald-500"
                                : forgotStrengthHint.level === "fair"
                                  ? "text-amber-500"
                                  : "text-muted-foreground")
                            }
                          >
                            {forgotStrengthHint.message}
                          </p>
                        ) : (
                          <p
                            id="forgot-strength-hint"
                            className="mt-1.5 text-xs text-muted-foreground"
                          >
                            Use 8+ characters and mix letters with numbers or symbols.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Confirm new password
                        </label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={forgotConfirm}
                          onChange={(e) => setForgotConfirm(e.target.value)}
                          placeholder="••••••••"
                          data-testid="forgot-confirm-password"
                          className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      </div>

                      {forgotError && (
                        <div
                          data-testid="forgot-error"
                          className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                        >
                          {forgotError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        data-testid="forgot-reset-submit"
                        className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                      >
                        {forgotLoading ? "Updating..." : "Reset password"}
                      </button>
                    </form>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">C</span>
          </div>
          <span className="text-xl font-bold text-foreground">CryptoVault</span>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
            </div>

            {isLocked && (
              <div
                data-testid="signin-lockout-banner"
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm"
              >
                Too many failed sign-in attempts. Please wait{" "}
                <strong className="text-amber-300">{formatRemaining(lockMsRemaining)}</strong>{" "}
                before trying again.
              </div>
            )}

            {error && !isLocked && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isLocked}
              data-testid="signin-submit"
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : isLocked ? (
                `Try again in ${formatRemaining(lockMsRemaining)}`
              ) : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/sign-up")}
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
