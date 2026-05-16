"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import PortfolioApp from "@/app/apps/[id]/PortfolioApp";
import type {
  AppConfigEnvelope,
  MediaRef,
  PortfolioConfig,
  PortfolioGiftMode,
  PortfolioPlanType,
  PortfolioSourceDocument,
} from "@/lib/types";

const EMPTY_PORTFOLIO: PortfolioConfig = {
  version: "1",
  gift_mode: "gift",
  recipient_name: "Portfolio Owner",
  buyer_email: "",
  app_title: "Portfolio Owner's Portfolio",
  profile: {
    name: "Portfolio Owner",
    headline: "Professional portfolio",
    summary: "Upload a resume and add notes to generate a polished portfolio preview.",
    links: [],
  },
  experience: [],
  projects: [],
  skills: [{ label: "Core Skills", skills: ["Leadership", "Delivery", "Technical depth"] }],
  education: [],
  theme: { mode: "dark", accent: "#6C63FF", layout: "cinematic" },
  source_summary: {
    inferred_from: ["intake form"],
    missing_info: ["Resume PDF"],
    notes: [],
  },
  quality_flags: [],
};

type IntakeState = {
  gift_mode: PortfolioGiftMode;
  recipient_name: string;
  buyer_email: string;
  recipient_context: string;
  portfolio_notes: string;
  target_roles: string;
  tone: string;
  preferred_theme: "cinematic" | "classic" | "minimal";
};

type UploadState = {
  resume_pdf?: PortfolioSourceDocument;
  cover_letter_pdf?: PortfolioSourceDocument;
};

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 75_000
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Check Supabase, the AI service, and your local server logs.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function mediaFromDocument(document: PortfolioSourceDocument): MediaRef {
  return {
    storage_path: document.storage_path,
    public_url: document.public_url ?? "",
    mime_type: document.mime_type,
    size_bytes: document.size_bytes,
  };
}

function buildEnvelope(
  appId: string,
  intake: IntakeState,
  uploads: UploadState,
  portfolio: PortfolioConfig
): AppConfigEnvelope {
  const media: AppConfigEnvelope["media"] = {};
  if (uploads.resume_pdf) media.resume_pdf = mediaFromDocument(uploads.resume_pdf);
  if (uploads.cover_letter_pdf) media.cover_letter_pdf = mediaFromDocument(uploads.cover_letter_pdf);

  return {
    _version: "1",
    meta: {
      template_slug: "portfolio-website",
      app_name: `${intake.recipient_name || "Portfolio Owner"}'s Portfolio`,
      theme: intake.preferred_theme,
      plan_type: "free_trial",
      buyer_email: intake.buyer_email,
      recipient_name: intake.recipient_name,
    },
    user_inputs: {
      gift_mode: intake.gift_mode,
      recipient_context: intake.recipient_context,
      portfolio_notes: intake.portfolio_notes,
      target_roles: intake.target_roles,
      tone: intake.tone,
      preferred_theme: intake.preferred_theme,
      draft_app_id: appId,
    },
    media,
    ai_content: portfolio as unknown as Record<string, unknown>,
  };
}

export default function PortfolioCustomizePage() {
  const generatedAppId = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );

  const [step, setStep] = useState<"intake" | "review">("intake");
  const [appId, setAppId] = useState<string>("");
  const [intake, setIntake] = useState<IntakeState>({
    gift_mode: "gift",
    recipient_name: "",
    buyer_email: "",
    recipient_context: "",
    portfolio_notes: "",
    target_roles: "",
    tone: "confident",
    preferred_theme: "cinematic",
  });
  const [uploads, setUploads] = useState<UploadState>({});
  const [portfolio, setPortfolio] = useState<PortfolioConfig>(EMPTY_PORTFOLIO);
  const [selectedPlan, setSelectedPlan] = useState<PortfolioPlanType>("free_trial");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo<PortfolioConfig>(() => ({
    ...portfolio,
    gift_mode: intake.gift_mode,
    recipient_name: intake.recipient_name || portfolio.recipient_name,
    buyer_email: intake.buyer_email || portfolio.buyer_email,
    app_title: `${intake.recipient_name || portfolio.profile.name || "Portfolio Owner"}'s Portfolio`,
    profile: {
      ...portfolio.profile,
      name: intake.recipient_name || portfolio.profile.name,
    },
    theme: {
      ...portfolio.theme,
      layout: intake.preferred_theme,
    },
  }), [intake, portfolio]);

  function update<K extends keyof IntakeState>(key: K, value: IntakeState[K]) {
    setIntake((current) => ({ ...current, [key]: value }));
  }

  async function ensureDraft() {
    if (appId) return appId;

    if (!intake.recipient_name.trim() || !intake.buyer_email.trim()) {
      throw new Error("Add the portfolio owner name and your email first.");
    }

    const res = await fetchWithTimeout("/api/portfolio/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: generatedAppId.current,
        recipient_name: intake.recipient_name,
        buyer_email: intake.buyer_email,
        gift_mode: intake.gift_mode,
      }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Could not create draft");
    setAppId(body.app.id);
    return body.app.id as string;
  }

  async function uploadDocument(fieldKey: "resume_pdf" | "cover_letter_pdf", file: File) {
    setError(null);
    setLoading(`Uploading ${fieldKey === "resume_pdf" ? "resume" : "cover letter"}...`);
    try {
      const draftId = await ensureDraft();
      const form = new FormData();
      form.append("app_id", draftId);
      form.append("field_key", fieldKey);
      form.append("file", file);

      const res = await fetchWithTimeout("/api/portfolio/upload", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed");

      setUploads((current) => ({ ...current, [fieldKey]: body.document }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(null);
    }
  }

  async function generatePreview() {
    setError(null);
    setLoading("Generating portfolio...");
    try {
      const draftId = await ensureDraft();
      const envelope = buildEnvelope(draftId, intake, uploads, portfolio);

      const res = await fetchWithTimeout("/api/portfolio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: draftId, user_config: envelope }),
      }, 90_000);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Generation failed");

      setPortfolio(body.portfolio as PortfolioConfig);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(null);
    }
  }

  async function choosePlan() {
    setError(null);
    setLoading("Preparing your app...");
    try {
      const draftId = await ensureDraft();
      const envelope = buildEnvelope(draftId, intake, uploads, preview);

      const res = await fetchWithTimeout("/api/portfolio/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: draftId,
          selected_plan_type: selectedPlan,
          user_config: envelope,
          portfolio: preview,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Plan selection failed");

      window.location.href = body.status_url ?? `/apps/${draftId}/status`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan selection failed");
      setLoading(null);
    }
  }

  function updateProfile<K extends keyof PortfolioConfig["profile"]>(
    key: K,
    value: PortfolioConfig["profile"][K]
  ) {
    setPortfolio((current) => ({
      ...current,
      profile: { ...current.profile, [key]: value },
    }));
  }

  function updateSkills(value: string) {
    const skills = value.split(",").map((skill) => skill.trim()).filter(Boolean);
    setPortfolio((current) => ({
      ...current,
      skills: [{ label: "Core Skills", skills }],
    }));
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight">
          AaaG
        </Link>
        <div className="text-sm text-gray-500">AI Portfolio Website</div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[440px_1fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              {step === "intake" ? "Intake" : "Review"}
            </p>
            <h1 className="mt-2 text-2xl font-bold">
              {step === "intake" ? "Build the portfolio story" : "Tune the generated site"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {step === "intake"
                ? "Upload a resume PDF, add optional context, then generate a preview."
                : "Edit the key extracted fields and watch the preview update."}
            </p>
          </div>

          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {step === "intake" ? (
            <div className="space-y-5">
              <Field label="Gift mode">
                <select
                  value={intake.gift_mode}
                  onChange={(event) => update("gift_mode", event.target.value as PortfolioGiftMode)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="gift">Gift someone else</option>
                  <option value="self">Gift myself</option>
                </select>
              </Field>

              <Field label="Portfolio owner name">
                <input
                  value={intake.recipient_name}
                  onChange={(event) => update("recipient_name", event.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Siddharth Shankar"
                />
              </Field>

              <Field label="Your email">
                <input
                  type="email"
                  value={intake.buyer_email}
                  onChange={(event) => update("buyer_email", event.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  placeholder="you@example.com"
                />
              </Field>

              <Field label="Relationship or context">
                <textarea
                  value={intake.recipient_context}
                  onChange={(event) => update("recipient_context", event.target.value)}
                  className="min-h-20 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  placeholder="This is for my friend applying to staff engineering roles."
                />
              </Field>

              <DocumentField
                label="Resume PDF"
                document={uploads.resume_pdf}
                required
                onFile={(file) => uploadDocument("resume_pdf", file)}
              />

              <DocumentField
                label="Cover letter PDF"
                document={uploads.cover_letter_pdf}
                onFile={(file) => uploadDocument("cover_letter_pdf", file)}
              />

              <Field label="Notes and links">
                <textarea
                  value={intake.portfolio_notes}
                  onChange={(event) => update("portfolio_notes", event.target.value)}
                  className="min-h-28 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Add projects, links, achievements, target companies, or anything the resume misses."
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Target roles">
                  <input
                    value={intake.target_roles}
                    onChange={(event) => update("target_roles", event.target.value)}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Senior Software Engineer"
                  />
                </Field>
                <Field label="Visual style">
                  <select
                    value={intake.preferred_theme}
                    onChange={(event) => update("preferred_theme", event.target.value as IntakeState["preferred_theme"])}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="cinematic">Cinematic</option>
                    <option value="classic">Classic</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </Field>
              </div>

              <button
                onClick={generatePreview}
                disabled={loading !== null}
                className="w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ?? "Generate preview"}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <Field label="Headline">
                <input
                  value={portfolio.profile.headline}
                  onChange={(event) => updateProfile("headline", event.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Summary">
                <textarea
                  value={portfolio.profile.summary}
                  onChange={(event) => updateProfile("summary", event.target.value)}
                  className="min-h-32 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Location">
                <input
                  value={portfolio.profile.location ?? ""}
                  onChange={(event) => updateProfile("location", event.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Core skills, comma-separated">
                <textarea
                  value={portfolio.skills[0]?.skills.join(", ") ?? ""}
                  onChange={(event) => updateSkills(event.target.value)}
                  className="min-h-20 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
              </Field>

              <div>
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Choose a plan
                </span>
                <div className="space-y-3">
                  {[
                    {
                      value: "free_trial" as const,
                      label: "Free trial",
                      price: "$0",
                      desc: "Public shared-template portfolio for two days.",
                    },
                    {
                      value: "one_time" as const,
                      label: "One-time",
                      price: "Manual",
                      desc: "Public portfolio now, pay-once checkout later.",
                    },
                    {
                      value: "managed" as const,
                      label: "Managed",
                      price: "Manual",
                      desc: "Public portfolio plus future maintenance and traffic pricing.",
                    },
                  ].map((plan) => (
                    <button
                      key={plan.value}
                      type="button"
                      onClick={() => setSelectedPlan(plan.value)}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                        selectedPlan === plan.value
                          ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200"
                          : "border-gray-200 hover:border-indigo-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">{plan.label}</span>
                        <span className="text-sm font-medium text-gray-500">{plan.price}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{plan.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("intake")}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={choosePlan}
                  disabled={loading !== null}
                  className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ?? "Select plan and finish"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-slate-950 shadow-sm">
          <div className="flex items-center gap-2 border-b border-white/10 bg-slate-900 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="ml-3 truncate text-xs text-slate-400">
              portfolio-{(intake.recipient_name || "preview").toLowerCase().replace(/\s+/g, "-")}.aaag.app
            </span>
          </div>
          <div className="max-h-[calc(100vh-120px)] overflow-auto">
            <PortfolioApp content={preview} preview />
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function DocumentField({
  label,
  required = false,
  document,
  onFile,
}: {
  label: string;
  required?: boolean;
  document?: PortfolioSourceDocument;
  onFile: (file: File) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 transition hover:border-indigo-300 hover:text-indigo-600">
        <span className="truncate">
          {document ? document.file_name : "Choose PDF"}
        </span>
        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500">PDF</span>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </label>
    </div>
  );
}
