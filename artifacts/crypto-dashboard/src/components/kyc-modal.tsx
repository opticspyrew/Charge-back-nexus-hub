import { useEffect, useRef, useState } from "react";
import { kycApi, type KycSubmitInput } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useKyc } from "@/hooks/use-kyc";

interface Props {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

const ID_TYPES = ["Passport", "National ID Card", "Driver's License", "Residence Permit"];
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

type FormState = Omit<KycSubmitInput, "photoUploadURL" | "photoMimeType">;

const EMPTY_FORM: FormState = {
  fullName: "",
  dateOfBirth: "",
  address: "",
  city: "",
  country: "",
  idType: ID_TYPES[0]!,
  idNumber: "",
};

export default function KycModal({ open, onClose, reason }: Props) {
  const { token } = useAuth();
  const { status, submission, refresh, setStatus } = useKyc();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photo, setPhoto] = useState<{ file: File; preview: string; mime: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const isPending = status === "pending";
  const isRejected = status === "rejected";
  const isApproved = status === "approved";

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Image is too large (max 8 MB).");
      return;
    }
    setError(null);
    const preview = URL.createObjectURL(file);
    setPhoto({ file, preview, mime: file.type });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("You must be signed in to submit verification.");
      return;
    }
    if (!photo) {
      setError("Please upload a photo of your government-issued ID.");
      return;
    }
    for (const k of Object.keys(form) as (keyof FormState)[]) {
      if (!form[k].trim()) {
        setError("Please fill out every field.");
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      // 1) Ask the API for a presigned upload URL.
      const { uploadURL } = await kycApi.requestUploadUrl(token);
      // 2) Upload the photo bytes directly to object storage.
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": photo.mime },
        body: photo.file,
      });
      if (!uploadRes.ok) {
        throw new Error("Could not upload your ID photo. Please try again.");
      }
      // 3) Tell the API where the photo lives so it can attach to the email
      //    and record the object path against the submission.
      await kycApi.submit(token, {
        ...form,
        photoUploadURL: uploadURL,
        photoMimeType: photo.mime,
      });
      setStatus("pending");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit verification.");
    } finally {
      setSubmitting(false);
    }
  }

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card border border-card-border rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-card-border">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Identity Verification
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isApproved
                ? "Your identity is verified."
                : isPending
                  ? "Your submission is under review."
                  : reason ?? "Verification is required before you can Send or Withdraw."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {isApproved ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-foreground">You're verified and ready to transact.</p>
            </div>
          ) : isPending ? (
            <div className="space-y-3 text-center py-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-foreground">Under review</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Our compliance team is reviewing your documents. This usually takes a few hours.
                You'll be able to Send and Withdraw as soon as your account is approved.
              </p>
              {submission?.createdAt && (
                <p className="text-[11px] text-muted-foreground">
                  Submitted {new Date(submission.createdAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {isRejected && submission?.reviewerNotes && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  <span className="font-semibold">Previous submission was rejected:</span> {submission.reviewerNotes}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full legal name" required>
                  <input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required className={inputClass} />
                </Field>
                <Field label="Date of birth" required>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} required className={inputClass} />
                </Field>
              </div>
              <Field label="Residential address" required>
                <input value={form.address} onChange={(e) => update("address", e.target.value)} required className={inputClass} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" required>
                  <input value={form.city} onChange={(e) => update("city", e.target.value)} required className={inputClass} />
                </Field>
                <Field label="Country" required>
                  <input value={form.country} onChange={(e) => update("country", e.target.value)} required className={inputClass} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="ID type" required>
                  <select value={form.idType} onChange={(e) => update("idType", e.target.value)} required className={inputClass}>
                    {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="ID number" required>
                  <input value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} required className={inputClass} />
                </Field>
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-1.5">Photo of your government ID <span className="text-red-400">*</span></p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                {photo ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-card-border bg-muted/40">
                    <img src={photo.preview} alt="ID preview" className="w-16 h-16 object-cover rounded-lg border border-card-border" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{photo.file.name}</p>
                      <p className="text-[11px] text-muted-foreground">{(photo.file.size / 1024).toFixed(0)} KB · {photo.mime}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >Replace</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-card-border hover:border-primary/60 hover:bg-muted/40 transition-colors text-xs text-muted-foreground"
                  >
                    Click to upload a clear photo of your ID (JPEG, PNG, WebP — max 8 MB)
                  </button>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit for verification"}
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Your information is encrypted and sent only to our compliance team.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 bg-muted/50 border border-card-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground mb-1.5 inline-block">
        {label} {required && <span className="text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}
