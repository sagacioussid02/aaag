"use client";

import { getTheme } from "@/app/apps/[id]/themes";

// Static placeholder recipes — shown before Claude generates the real ones
const PLACEHOLDER_RECIPES = [
  { emoji: "🍝", title: "Spaghetti Carbonara", cuisine: "Italian", time: "30min", difficulty: "easy" },
  { emoji: "🍛", title: "Butter Chicken", cuisine: "Indian", time: "45min", difficulty: "medium" },
  { emoji: "🌮", title: "Street Tacos", cuisine: "Mexican", time: "25min", difficulty: "easy" },
  { emoji: "🍜", title: "Ramen Bowl", cuisine: "Japanese", time: "60min", difficulty: "medium" },
  { emoji: "🥗", title: "Greek Salad", cuisine: "Mediterranean", time: "15min", difficulty: "easy" },
  { emoji: "🥟", title: "Dim Sum Dumplings", cuisine: "Chinese", time: "50min", difficulty: "hard" },
];

type Answers = Record<string, unknown>;

type Props = { answers: Answers };

export default function RecipePreview({ answers }: Props) {
  const name = (answers.recipient_name as string) || "Someone Special";
  const theme = (answers.theme as string) || "Warm Rose";
  const message = (answers.message as string) || "";
  const cuisines = (answers.cuisines as string[]) || [];

  const t = getTheme(theme);

  // Filter placeholder recipes to match selected cuisines, fall back to all
  const visible =
    cuisines.length > 0
      ? PLACEHOLDER_RECIPES.filter((r) => cuisines.includes(r.cuisine))
      : PLACEHOLDER_RECIPES;

  const recipes = visible.length > 0 ? visible : PLACEHOLDER_RECIPES.slice(0, 3);

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg text-sm">

      {/* Simulated browser chrome */}
      <div className="bg-gray-100 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded text-xs text-gray-400 px-3 py-0.5 text-center">
          recipe-{name.toLowerCase().replace(/\s+/g, "-")}.aaag.com
        </div>
      </div>

      {/* App header */}
      <div className={`bg-gradient-to-br ${t.gradient} px-5 py-6 text-center`}>
        <p className="text-white/70 text-xs uppercase tracking-widest mb-1">
          A gift for {name}
        </p>
        <h2 className="text-lg font-bold text-white mb-1">{name}'s Kitchen</h2>
        <p className="text-white/80 text-xs">
          A collection of recipes made just for you
        </p>
        {message && (
          <div className="mt-3 bg-white/20 rounded-xl px-3 py-2 text-left inline-block max-w-full">
            <p className="text-white/60 text-xs mb-0.5">A note from the gifter</p>
            <p className="text-white text-xs italic truncate">"{message}"</p>
          </div>
        )}
      </div>

      {/* Cuisine filter bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-1.5 overflow-x-auto">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.tagBg} ${t.tagText}`}>
          All
        </span>
        {cuisines.slice(0, 4).map((c) => (
          <span key={c} className="px-2 py-0.5 rounded-full text-xs text-gray-400 bg-gray-50">
            {c}
          </span>
        ))}
      </div>

      {/* Recipe grid */}
      <div className="bg-gray-50 px-4 py-4 grid grid-cols-2 gap-3">
        {recipes.slice(0, 4).map((r, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
            <div className="text-2xl mb-1.5">{r.emoji}</div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.tagBg} ${t.tagText}`}>
              {r.cuisine}
            </span>
            <p className="font-medium text-gray-800 text-xs mt-1.5 leading-snug">{r.title}</p>
            <p className="text-gray-400 text-xs mt-1">⏱ {r.time} · {r.difficulty}</p>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="bg-white px-4 py-2 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {recipes.length} of 12 recipes shown · Claude generates the rest
        </p>
      </div>
    </div>
  );
}
