import Link from "next/link";
import { getTemplates } from "@/lib/db/templates";
import type { TemplateRecord } from "@/lib/types";

export const revalidate = 3600; // Re-fetch template list at most once per hour

export default async function TemplatesPage() {
  let templates: TemplateRecord[] = [];
  try {
    templates = await getTemplates();
  } catch {
    // Fall through — show empty state rather than crashing
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition">
          ← Back
        </Link>
        <h1 className="text-4xl font-bold mt-6 mb-2">Choose a template</h1>
        <p className="text-gray-500 mb-12">
          Pick a template, personalise it, and gift a real web app in minutes.
        </p>

        {templates.length === 0 ? (
          <p className="text-gray-400 text-sm">No templates available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {templates.map((t) => (
              <TemplateCard key={t.slug} template={t} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function TemplateCard({ template: t }: { template: TemplateRecord }) {
  const fromPrice = (t.base_price_cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

  return (
    <Link
      href={`/templates/${t.slug}`}
      className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition group"
    >
      <div className="text-4xl mb-3">{t.emoji || "📦"}</div>
      <h2 className="text-lg font-semibold mb-1">{t.name}</h2>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{t.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 capitalize">{t.category}</span>
          {!t.is_system && t.creator_name && (
            <span className="text-xs text-indigo-400">by {t.creator_name}</span>
          )}
        </div>
        <span className="text-indigo-600 font-semibold text-sm">
          From {fromPrice} →
        </span>
      </div>
    </Link>
  );
}
