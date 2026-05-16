"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type {
  TemplateRecord,
  ConfigSchema,
  FieldDef,
  AppConfigEnvelope,
  AppMeta,
  MediaRef,
} from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEnvelope(
  templateSlug: string,
  schema: ConfigSchema,
  answers: Record<string, unknown>
): AppConfigEnvelope {
  // Keys that go into meta (not user_inputs)
  const META_KEYS = new Set(["recipient_name", "buyer_email", "app_name", "theme", "plan_type"]);

  const userInputs: Record<string, string | string[] | number | boolean> = {};
  const media: Record<string, MediaRef | MediaRef[]> = {};

  schema.steps.forEach((step) => {
    step.fields.forEach((field) => {
      const val = answers[field.key];
      if (val === undefined) return;

      if (field.type === "image_upload") {
        media[field.key] = val as MediaRef[];
      } else if (!META_KEYS.has(field.key)) {
        userInputs[field.key] = val as string | string[] | number | boolean;
      }
    });
  });

  const meta: AppMeta = {
    template_slug:  templateSlug,
    app_name:       ((answers.app_name as string) || (answers.recipient_name as string) || "My App").trim(),
    theme:          (answers.theme   as string) || "Warm Rose",
    plan_type:      (answers.plan_type as string) || "spark",
    buyer_email:    (answers.buyer_email as string) || "",
    recipient_name: (answers.recipient_name as string) || "",
  };

  return { _version: "1", meta, user_inputs: userInputs, media, ai_content: {} };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomizePage() {
  const params     = useParams();
  const router     = useRouter();
  const templateId = params.templateId as string;

  // Pre-generated UUID — keeps media storage paths consistent with the app record
  const pendingAppId = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );

  const [template,    setTemplate]    = useState<TemplateRecord | null>(null);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [step,        setStep]        = useState(0);
  const [answers,     setAnswers]     = useState<Record<string, unknown>>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch template + schema, pre-fill defaults
  useEffect(() => {
    fetch(`/api/templates/${templateId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Template "${templateId}" not found`);
        return res.json() as Promise<TemplateRecord>;
      })
      .then((t) => {
        setTemplate(t);
        const defaults: Record<string, unknown> = {};
        t.config_schema.steps.forEach((s) =>
          s.fields.forEach((f) => { if (f.default !== undefined) defaults[f.key] = f.default; })
        );
        setAnswers(defaults);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load template"));
  }, [templateId]);

  function update(key: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleNext() {
    if (!template) return;
    const schema    = template.config_schema;
    const isLastStep = step === schema.steps.length - 1;

    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const envelope = buildEnvelope(templateId, schema, answers);
      const res = await fetch("/api/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_config: envelope, pending_app_id: pendingAppId.current }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Generation failed");
      }

      const { app_id } = await res.json();
      router.push(`/apps/${app_id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{loadError}</p>
          <Link href="/templates" className="text-indigo-600 hover:underline text-sm">
            ← Back to templates
          </Link>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 animate-pulse">Loading…</p>
      </div>
    );
  }

  const schema      = template.config_schema;
  const currentStep = schema.steps[step];
  const isLastStep  = step === schema.steps.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight text-gray-900">AaaG</Link>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <Link href="/templates" className="hover:text-gray-900 transition">Templates</Link>
          <span className="text-gray-300">|</span>
          <span className="text-gray-400">Customizing {template.name}</span>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Step progress */}
          <div className="flex items-center gap-2 mb-8">
            {schema.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < step  ? "bg-indigo-500 text-white"
                    : i === step ? "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-400"
                    : "bg-gray-100 text-gray-400"
                  }`}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span className={`hidden sm:block text-xs font-medium transition-colors truncate max-w-[60px] ${
                    i === step ? "text-indigo-600" : i < step ? "text-gray-500" : "text-gray-300"
                  }`}>
                    {s.id}
                  </span>
                </div>
                {i < schema.steps.length - 1 && (
                  <div className={`flex-1 h-px transition-colors ${i < step ? "bg-indigo-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-1">{currentStep.title}</h2>
          {currentStep.subtitle && (
            <p className="text-sm text-gray-400 mb-6">{currentStep.subtitle}</p>
          )}

          {/* Fields */}
          <div className="space-y-5 mt-6">
            {currentStep.fields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={answers[field.key]}
                onChange={(val) => update(field.key, val)}
                pendingAppId={pendingAppId.current}
                templateSlug={templateId}
              />
            ))}
          </div>

          {submitError && (
            <p className="mt-4 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{submitError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-5 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={submitting}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {submitting
                ? "Claude is building your app…"
                : isLastStep
                ? "Generate my app — it's free →"
                : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Field Renderer ───────────────────────────────────────────────────────────

type FieldRendererProps = {
  field:        FieldDef;
  value:        unknown;
  onChange:     (val: unknown) => void;
  pendingAppId: string;
  templateSlug: string;
};

function FieldRenderer({ field, value, onChange, pendingAppId, templateSlug }: FieldRendererProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>

      {field.type === "text" || field.type === "email" ? (
        <input
          type={field.type}
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          maxLength={field.type === "text" ? field.max_length : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      ) : field.type === "textarea" ? (
        <textarea
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          maxLength={field.max_length}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
        />
      ) : field.type === "number" ? (
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={(value as number) ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      ) : field.type === "toggle" ? (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            value ? "bg-indigo-500" : "bg-gray-200"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            value ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
      ) : field.type === "select" ? (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Select one</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : field.type === "multiselect" ? (
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => {
            const selected = ((value as string[]) ?? []).includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => {
                  const current = (value as string[]) ?? [];
                  onChange(selected ? current.filter((x) => x !== o) : [...current, o]);
                }}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  selected
                    ? "bg-indigo-500 text-white border-indigo-500"
                    : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      ) : field.type === "plan_picker" ? (
        <div className="space-y-3">
          {field.options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                value === o.value
                  ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300"
                  : "border-gray-200 hover:border-indigo-200"
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-sm">{o.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 line-through">{o.price}</span>
                  {o.badge && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      {o.badge}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400">{o.desc}</div>
            </button>
          ))}
        </div>
      ) : field.type === "image_upload" ? (
        <ImageUploadField
          field={field}
          value={(value as MediaRef[]) ?? []}
          onChange={onChange}
          pendingAppId={pendingAppId}
          templateSlug={templateSlug}
        />
      ) : null}

      {field.hint && (
        <p className="mt-1 text-xs text-gray-400">{field.hint}</p>
      )}
    </div>
  );
}

// ─── Image Upload Field ───────────────────────────────────────────────────────

type ImageUploadProps = {
  field:        FieldDef & { type: "image_upload" };
  value:        MediaRef[];
  onChange:     (val: MediaRef[]) => void;
  pendingAppId: string;
  templateSlug: string;
};

function ImageUploadField({ field, value, onChange, pendingAppId, templateSlug }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxFiles = field.max_files ?? 6;
  const canAdd   = value.length < maxFiles;

  async function handleFiles(files: FileList) {
    setUploadError(null);
    const toUpload = Array.from(files).slice(0, maxFiles - value.length);
    if (toUpload.length === 0) return;

    setUploading(true);
    const results: MediaRef[] = [];

    for (const file of toUpload) {
      const form = new FormData();
      form.append("pending_app_id", pendingAppId);
      form.append("field_key",      field.key);
      form.append("template_slug",  templateSlug);
      form.append("file",           file);

      const res = await fetch("/api/upload", { method: "POST", body: form });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setUploadError(body.error ?? `Upload failed for ${file.name}`);
        break;
      }

      results.push(await res.json() as MediaRef);
    }

    onChange([...value, ...results]);
    setUploading(false);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {/* Thumbnails */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((ref, i) => (
            <div key={ref.storage_path} className="relative group w-20 h-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ref.public_url}
                alt={`Upload ${i + 1}`}
                className="w-full h-full object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {canAdd && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-500 transition disabled:opacity-50"
        >
          {uploading ? (
            <span className="animate-pulse">Uploading…</span>
          ) : (
            <>
              <span className="text-lg">📷</span>
              {value.length === 0
                ? `Add photos (up to ${maxFiles})`
                : `Add more (${value.length}/${maxFiles})`}
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={(field.accept ?? ["image/jpeg", "image/png", "image/webp"]).join(",")}
        multiple={field.multiple}
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}
    </div>
  );
}
