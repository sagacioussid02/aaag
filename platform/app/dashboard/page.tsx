import Link from "next/link";
import NavAuth from "../components/NavAuth";
import { listPortfolioBuilds } from "@/lib/db/portfolio";

const PRODUCTS = [
  {
    slug: "portfolio-website",
    name: "AI Portfolio Website",
    description:
      "Gift a polished portfolio site generated from a resume, cover letter, and a few personal notes.",
    status: "Ready for MVP",
    href: "/customize/portfolio-website",
    plan: "Free trial: 2 days",
  },
];

export default async function DashboardPage() {
  let builds: Awaited<ReturnType<typeof listPortfolioBuilds>> = [];
  let buildError = "";

  try {
    builds = await listPortfolioBuilds();
  } catch (err) {
    buildError = err instanceof Error ? err.message : "Could not load portfolio apps";
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          AaaG
        </Link>
        <div className="flex items-center gap-5 text-sm text-gray-600">
          <Link href="/templates" className="hover:text-gray-950">
            Templates
          </Link>
          <NavAuth />
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold">Choose an app to gift</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Start with one demo-ready product today. More app templates can plug into
              the same workflow after the portfolio path is live.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {PRODUCTS.map((product) => (
            <Link
              key={product.slug}
              href={product.href}
              className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                    {product.status}
                  </div>
                  <h2 className="text-xl font-semibold">{product.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {product.description}
                  </p>
                </div>
                <span className="text-2xl" aria-hidden="true">
                  PF
                </span>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
                <span className="text-gray-500">{product.plan}</span>
                <span className="font-medium text-indigo-600 group-hover:text-indigo-700">
                  Start flow
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Your portfolio apps</h2>
              <p className="mt-1 text-sm text-gray-500">
                Build requests and public shared-template links appear here.
              </p>
            </div>
          </div>

          {buildError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {buildError}
            </div>
          ) : builds.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
              No portfolio apps yet. Start the AI Portfolio Website flow above.
            </div>
          ) : (
            <div className="space-y-3">
              {builds.map(({ build, app }) => {
                const title = app?.config.meta.app_name || "Portfolio website";
                const publicUrl = build.public_url ?? app?.public_url ?? `/apps/${build.app_id}`;
                return (
                  <div
                    key={build.id}
                    className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          build.status === "live" ? "bg-green-500" : build.status === "failed" ? "bg-red-500" : "bg-amber-500"
                        }`} />
                        <h3 className="font-semibold">{title}</h3>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {build.selected_plan.label} · {build.deployment_strategy.replace("_", " ")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/apps/${build.app_id}/status`}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                      >
                        Status
                      </Link>
                      <Link
                        href={publicUrl}
                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
