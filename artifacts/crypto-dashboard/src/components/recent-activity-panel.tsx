import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { authApi, type AuthSessionRecord } from "@/lib/api";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";

  let os = "Unknown OS";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod|iOS/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome|Chromium/i.test(ua)) browser = "Safari";

  return `${browser} on ${os}`;
}

function describeIp(ip: string | null): string {
  if (!ip) return "IP unknown";
  // Strip IPv4-mapped IPv6 prefix for cleaner display.
  return ip.replace(/^::ffff:/, "");
}

export default function RecentActivityPanel() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<AuthSessionRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    authApi
      .sessions(token)
      .then((rows) => {
        if (!cancelled) {
          setSessions(rows);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load recent activity.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div
      className="bg-card border border-card-border rounded-2xl p-6"
      data-testid="recent-activity-panel"
    >
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-foreground">Recent activity</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Recent sign-ins to your account. If you see anything you don't
            recognize, change your password right away.
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground py-4" data-testid="recent-activity-loading">
          Loading recent sign-ins…
        </p>
      )}

      {error && !loading && (
        <p className="text-sm text-destructive py-4" data-testid="recent-activity-error">
          {error}
        </p>
      )}

      {!loading && !error && sessions && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground py-4" data-testid="recent-activity-empty">
          No recent sign-ins to show.
        </p>
      )}

      {!loading && !error && sessions && sessions.length > 0 && (
        <ul className="divide-y divide-border" data-testid="recent-activity-list">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-start gap-4 py-3 first:pt-0 last:pb-0"
              data-testid={`recent-activity-item-${s.id}`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  s.current ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 17v-2a4 4 0 014-4h3m-7-7a4 4 0 110 8 4 4 0 010-8z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">
                    {describeUserAgent(s.userAgent)}
                  </p>
                  {s.current && (
                    <span
                      className="px-2 py-0.5 bg-primary/15 text-primary text-[10px] font-bold rounded-full border border-primary/20"
                      data-testid={`recent-activity-current-${s.id}`}
                    >
                      THIS DEVICE
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatTimestamp(s.createdAt)} • {describeIp(s.ipAddress)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
