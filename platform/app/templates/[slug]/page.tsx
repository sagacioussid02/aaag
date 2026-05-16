import Link from "next/link";
import { notFound } from "next/navigation";

const TEMPLATES: Record<string, {
  emoji: string;
  name: string;
  tagline: string;
  description: string;
  from_price: string;
  best_for: string;
  what_you_get: string[];
}> = {
  "recipe-app": {
    emoji: "🍳",
    name: "Recipe App",
    tagline: "A personalized cookbook just for them",
    description:
      "Answer a few questions about the recipient and Claude will generate a beautiful cookbook app — 12 curated recipes based on their favourite cuisines, dietary needs, and cooking skill.",
    from_price: "$9.99",
    best_for: "Birthday gift, anniversary, housewarming",
    what_you_get: [
      "12 fully written recipes personalised to their tastes",
      "Beautiful themed app with their name on it",
      "Works on any phone, no download needed",
      "A personal note from you shown inside the app",
      "Shareable link you can send via text or email",
    ],
  },
  "travel-planner": {
    emoji: "✈️",
    name: "Travel Planner",
    tagline: "Your group's private AI trip companion",
    description:
      "Tell us about the trip and the group — Claude builds a day-by-day itinerary, packing list, and restaurant picks, all in one shareable app.",
    from_price: "$14.99",
    best_for: "Family trips, group vacations, honeymoons",
    what_you_get: [
      "Full day-by-day itinerary for the trip",
      "Restaurant and activity recommendations",
      "Personalised packing list",
      "Shareable with the whole group",
      "Works on any phone, no download needed",
    ],
  },
  "trip-game": {
    emoji: "🎮",
    name: "Trip Game",
    tagline: "Pictionary and trivia for your road trip",
    description:
      "Custom games with prompts specific to your destination and the people in your group — perfect for flights and road trips.",
    from_price: "$9.99",
    best_for: "Road trips, flights, group hangouts",
    what_you_get: [
      "Custom trivia questions about your destination",
      "Pictionary prompts personalised to your group",
      "Works offline once loaded",
      "Shareable with everyone in the car or plane",
      "No app download needed",
    ],
  },
  "event-app": {
    emoji: "🎉",
    name: "Event App",
    tagline: "Invites, RSVP, and memories in one place",
    description:
      "A dedicated app for your event — guests get all the details, RSVP, and can see updates, all from one shareable link.",
    from_price: "$9.99",
    best_for: "Weddings, reunions, birthday parties",
    what_you_get: [
      "Event schedule and details page",
      "Personal welcome message for guests",
      "Easy to share via text or email",
      "Works on any phone, no download needed",
      "Your branding and colour theme",
    ],
  },
};

type Props = { params: Promise<{ slug: string }> };

export default async function TemplateDetailPage({ params }: Props) {
  const { slug } = await params;
  const template = TEMPLATES[slug];

  if (!template) notFound();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/templates" className="text-sm text-gray-400 hover:text-gray-600 transition">
          ← All templates
        </Link>

        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="text-5xl mb-4">{template.emoji}</div>
          <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
          <p className="text-gray-500 italic mb-4">{template.tagline}</p>
          <p className="text-gray-700 leading-relaxed mb-6">{template.description}</p>

          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              What you get
            </h2>
            <ul className="space-y-2">
              {template.what_you_get.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-indigo-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Starting from</p>
              <p className="text-2xl font-bold text-gray-900">{template.from_price}</p>
            </div>
            <Link
              href={`/customize/${slug}`}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
            >
              Customize this →
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Takes about 3 minutes · No credit card until checkout
        </p>
      </div>
    </main>
  );
}
