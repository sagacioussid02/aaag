import { notFound } from "next/navigation";
import { getApp } from "@/lib/db/apps";
import RecipeApp from "./RecipeApp";
import DiaryApp from "./DiaryApp";
import PortfolioApp from "./PortfolioApp";
import type { RecipeContent, DiaryAppContent, PortfolioContent } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function AppPage({ params }: Props) {
  const { id } = await params;
  const app = await getApp(id);

  if (!app || app.status !== "live") notFound();

  const { meta, ai_content } = app.config;

  switch (meta.template_slug) {
    case "recipe-app":
      return (
        <RecipeApp
          content={ai_content as RecipeContent}
          theme={meta.theme}
          recipientName={meta.recipient_name}
        />
      );

    case "personal-diary":
      return (
        <DiaryApp
          content={ai_content as DiaryAppContent}
          config={app.config}
        />
      );

    case "portfolio-website":
      return (
        <PortfolioApp
          content={ai_content as PortfolioContent}
        />
      );

    default:
      // Unknown template — show a generic "coming soon" rather than a hard 404
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-sm px-6">
            <div className="text-5xl mb-4">🚧</div>
            <h1 className="text-2xl font-bold mb-2">{meta.app_name}</h1>
            <p className="text-gray-500 text-sm">
              This app is live but its template renderer ({meta.template_slug}) hasn&apos;t been
              built into the platform yet. Check back soon!
            </p>
          </div>
        </div>
      );
  }
}
