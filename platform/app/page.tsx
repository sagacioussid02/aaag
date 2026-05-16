import Link from "next/link";
import NavAuth from "./components/NavAuth";

const TEMPLATES = [
  {
    slug: "recipe-app",
    emoji: "🍳",
    name: "Recipe App",
    tagline: "A personalized cookbook just for her",
    description: "Curated recipes based on their cuisine preferences, dietary needs, and cooking level.",
    from_price: "$9.99",
    best_for: "Birthday gift, anniversary",
  },
  {
    slug: "travel-planner",
    emoji: "✈️",
    name: "Travel Planner",
    tagline: "Your family's private AI trip companion",
    description: "Day-by-day itinerary, restaurant picks, packing list — all personalized to your group.",
    from_price: "$14.99",
    best_for: "Family trips, group vacations",
  },
  {
    slug: "trip-game",
    emoji: "🎮",
    name: "Trip Game",
    tagline: "Pictionary and trivia for your road trip",
    description: "Custom games with prompts specific to your destination and group members.",
    from_price: "$9.99",
    best_for: "Road trips, flights, group hangouts",
  },
  {
    slug: "event-app",
    emoji: "🎉",
    name: "Event App",
    tagline: "Invites, RSVP, and memories in one place",
    description: "A dedicated app for your wedding, reunion, or birthday — shareable with all guests.",
    from_price: "$9.99",
    best_for: "Weddings, reunions, parties",
  },
];

const PLANS = [
  {
    name: "Spark",
    price: "$9.99",
    period: "one-time",
    duration: "30 days",
    users: "Up to 5 people",
    best_for: "Birthday surprise, quick gift",
    highlight: false,
  },
  {
    name: "Moment",
    price: "$24.99",
    period: "one-time",
    duration: "90 days",
    users: "Up to 20 people",
    best_for: "Group trips, family events",
    highlight: true,
  },
  {
    name: "Keep",
    price: "$4.99",
    period: "/ month",
    duration: "Forever",
    users: "Unlimited",
    best_for: "Ongoing hobby app, family tool",
    highlight: false,
  },
];

const STEPS = [
  { step: "1", title: "Choose a template", desc: "Pick from our curated micro-app templates." },
  { step: "2", title: "Answer a few questions", desc: "Takes about 3 minutes. No technical knowledge needed." },
  { step: "3", title: "Share the link", desc: "Works instantly on any phone or browser. No download required." },
];

const FAQS = [
  { q: "Does the recipient need to download anything?", a: "No. They open a link in their browser. They can optionally install it like an app on their phone with one tap." },
  { q: "What happens when the app expires?", a: "We warn you 7 days before expiry. You can extend your plan anytime from your dashboard." },
  { q: "Can I extend my plan?", a: "Yes. Log into your dashboard and extend at any time. Pricing stays the same." },
  { q: "Is my data private?", a: "Yes. Only people with your unique link can see the app. We never share your data." },
  { q: "What if I'm not happy with the result?", a: "Contact us within 48 hours and we'll regenerate or refund — no questions asked." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span className="text-xl font-bold tracking-tight">AaaG</span>
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <Link href="/templates" className="hover:text-gray-900">Templates</Link>
          <Link href="#pricing" className="hover:text-gray-900">Pricing</Link>
          <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
          <NavAuth />
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Gift someone a personalized app.
          <br />
          <span className="text-indigo-600">No code. No contracts.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Choose a template, answer a few questions, and we'll generate a custom web app
          in minutes. Share the link — it works like a real app on any phone.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/templates"
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition">
            See Templates →
          </Link>
          <a href="#how-it-works"
            className="border border-gray-200 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition">
            How it works ↓
          </a>
        </div>

        {/* Social proof nudge */}
        <p className="mt-8 text-sm text-gray-400">
          Apps ready in under 3 minutes · No technical knowledge needed · Cancel anytime
        </p>
      </section>

      {/* Templates */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Pick a template</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {TEMPLATES.map((t) => (
            <Link key={t.slug} href={`/templates/${t.slug}`}
              className="border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition group">
              <div className="text-4xl mb-3">{t.emoji}</div>
              <h3 className="text-lg font-semibold mb-1">{t.name}</h3>
              <p className="text-gray-500 text-sm mb-3 italic">{t.tagline}</p>
              <p className="text-gray-600 text-sm mb-4">{t.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{t.best_for}</span>
                <span className="text-indigo-600 font-semibold text-sm">From {t.from_price}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Simple pricing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <div key={p.name}
              className={`border rounded-2xl p-6 flex flex-col ${p.highlight
                ? "border-indigo-400 shadow-lg ring-1 ring-indigo-300"
                : "border-gray-200"}`}>
              {p.highlight && (
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full self-start mb-3">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="text-gray-400 text-sm ml-1">{p.period}</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-2 flex-1">
                <li>⏱ {p.duration}</li>
                <li>👥 {p.users}</li>
                <li>💡 {p.best_for}</li>
              </ul>
              <Link href="/templates"
                className={`mt-6 text-center py-2 rounded-lg font-medium text-sm transition ${p.highlight
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "border border-gray-300 hover:bg-gray-50"}`}>
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-10">FAQ</h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <h3 className="font-semibold mb-1">{faq.q}</h3>
                <p className="text-gray-500 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to gift an app?</h2>
        <p className="text-gray-500 mb-8">Takes 3 minutes. No credit card until checkout.</p>
        <Link href="/templates"
          className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition">
          Choose a template →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
        <p>© 2025 AaaG. Apps As A Gift.</p>
      </footer>

    </main>
  );
}
