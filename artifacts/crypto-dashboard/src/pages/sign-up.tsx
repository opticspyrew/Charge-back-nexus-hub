import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { getPasswordStrengthHint, validatePassword } from "@/lib/password-policy";
import { ForgotPasswordPanel } from "@/components/forgot-password-panel";
import PasswordInput from "@/components/password-input";

export default function SignUp() {
  const [, navigate] = useLocation();
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", assets: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  const strengthHint = useMemo(
    () => getPasswordStrengthHint(form.password),
    [form.password],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    const passwordCheck = validatePassword(form.password);
    if (!passwordCheck.ok) {
      setError(passwordCheck.error ?? "Please choose a stronger password.");
      return;
    }
    setLoading(true);
    try {
      const initialUsd = form.assets ? parseFloat(form.assets.replace(/,/g, "")) : undefined;
      await signup(form.name, form.email, form.password, initialUsd);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return <ForgotPasswordPanel onClose={() => setShowForgot(false)} />;
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
          <h1 className="text-2xl font-bold text-foreground mb-1">Create account</h1>
          <p className="text-muted-foreground text-sm mb-8">Start trading crypto in minutes</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="John Doe"
                autoComplete="name"
                autoCapitalize="words"
                className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                className="w-full px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <PasswordInput
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 chars, mix letters & numbers"
                autoComplete="new-password"
                className="px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                aria-describedby="password-strength-hint"
              />
              {strengthHint ? (
                <p
                  id="password-strength-hint"
                  data-testid="password-strength-hint"
                  className={
                    "mt-1.5 text-xs " +
                    (strengthHint.level === "strong"
                      ? "text-emerald-500"
                      : strengthHint.level === "fair"
                      ? "text-amber-500"
                      : "text-muted-foreground")
                  }
                >
                  {strengthHint.message}
                </p>
              ) : (
                <p id="password-strength-hint" className="mt-1.5 text-xs text-muted-foreground">
                  Use 8+ characters and mix letters with numbers or symbols.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirm password</label>
              <PasswordInput
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="••••••••"
                autoComplete="new-password"
                className="px-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 uppercase tracking-wider">
                Assets in Total ($)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.assets}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    setForm(f => ({ ...f, assets: raw }));
                  }}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 bg-muted border border-primary/40 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all font-semibold"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Enter your total asset value — this becomes your available portfolio balance.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </>
              ) : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/sign-in")}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <button
              onClick={() => setShowForgot(true)}
              data-testid="signup-forgot-password"
              className="text-primary hover:underline font-medium"
            >
              Forgot your password?
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
