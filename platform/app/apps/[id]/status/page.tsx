import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortfolioApp, getPortfolioBuildByAppId } from "@/lib/db/portfolio";

type Props = { params: Promise<{ id: string }> };

function statusLabel(status: string) {
  switch (status) {
    case "live":
      return "Ready to view";
    case "failed":
      return "Needs attention";
    case "deploying":
      return "Preparing public link";
    case "generating":
      return "Generating";
    default:
      return "Queued";
  }
}

export default async function PortfolioStatusPage({ params }: Props) {
  const { id } = await params;
  const [app, build] = await Promise.all([
    getPortfolioApp(id),
    getPortfolioBuildByAppId(id),
  ]);

  if (!app || app.config.meta.template_slug !== "portfolio-website") notFound();

  const publicUrl = build?.public_url ?? app.public_url ?? `/apps/${id}`;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight">
          AaaG
        </Link>
        <Link href={`/apps/${id}`} className="text-sm font-medium text-indigo-600">
          View portfolio
        </Link>
      </nav>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Build status
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {app.config.meta.app_name || "Your portfolio website"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            We will notify you in the dashboard when this app is ready. For the MVP,
            this shared-template portfolio is available immediately after plan selection.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
              <p className="mt-2 font-semibold">{statusLabel(build?.status ?? app.status)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Plan</p>
              <p className="mt-2 font-semibold">
                {build?.selected_plan.label ?? "Free trial"}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Strategy</p>
              <p className="mt-2 font-semibold">Shared template</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Public URL</p>
            <Link href={publicUrl} className="mt-2 block break-all text-sm font-medium text-indigo-600">
              {publicUrl}
            </Link>
          </div>

          <div className="mt-6">
            <h2 className="font-semibold">Logs</h2>
            <div className="mt-3 space-y-2">
              {(build?.logs.length ? build.logs : []).map((log) => (
                <div key={log.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <span className="mr-2 text-xs text-gray-400">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                  {log.message}
                </div>
              ))}
              {!build?.logs.length && (
                <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  Waiting for build logs.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
