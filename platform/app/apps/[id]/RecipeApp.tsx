"use client";

import { useState } from "react";
import type { Recipe, RecipeContent } from "@/lib/types";
import { getTheme } from "./themes";

type Props = {
  content: RecipeContent;
  theme: string;
  recipientName: string;
};

export default function RecipeApp({ content, theme, recipientName }: Props) {
  const t = getTheme(theme);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [filter, setFilter] = useState<string>("All");

  const cuisines = ["All", ...Array.from(new Set(content.recipes.map((r) => r.cuisine)))];
  const visible = filter === "All" ? content.recipes : content.recipes.filter((r) => r.cuisine === filter);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Header */}
      <header className={`bg-gradient-to-br ${t.gradient} px-6 py-16 text-center`}>
        <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-3">
          A gift for {recipientName}
        </p>
        <h1 className="text-4xl font-bold text-white mb-4">{content.app_title}</h1>
        <p className="text-white/90 text-lg max-w-xl mx-auto">{content.welcome_message}</p>

        {content.personal_note && (
          <div className="mt-8 inline-block bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 max-w-md text-left">
            <p className="text-xs text-white/60 font-medium mb-1">A note from the gifter</p>
            <p className="text-white italic text-sm leading-relaxed">"{content.personal_note}"</p>
          </div>
        )}
      </header>

      {/* Cuisine filter */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {cuisines.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === c
                  ? `${t.tagBg} ${t.tagText} ring-1 ring-current`
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe grid */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-sm text-gray-400 mb-6">{visible.length} recipes</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              theme={t}
              onClick={() => setSelected(recipe)}
            />
          ))}
        </div>
      </main>

      {/* Recipe detail modal */}
      {selected && (
        <RecipeModal
          recipe={selected}
          theme={t}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────

type CardProps = {
  recipe: Recipe;
  theme: ReturnType<typeof getTheme>;
  onClick: () => void;
};

function RecipeCard({ recipe, theme: t, onClick }: CardProps) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition ring-2 ring-transparent ${t.cardRing} w-full`}
    >
      <div className="text-4xl mb-3">{recipe.emoji}</div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.tagBg} ${t.tagText}`}>
          {recipe.cuisine}
        </span>
        <span className="text-xs text-gray-400 capitalize">{recipe.difficulty}</span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 leading-snug">{recipe.title}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mb-4">{recipe.description}</p>
      <div className="flex gap-4 text-xs text-gray-400">
        <span>⏱ {recipe.prep_time_minutes + recipe.cook_time_minutes}min</span>
        <span>👥 {recipe.servings} servings</span>
      </div>
    </button>
  );
}

// ─── Recipe Modal ─────────────────────────────────────────────────────────────

type ModalProps = {
  recipe: Recipe;
  theme: ReturnType<typeof getTheme>;
  onClose: () => void;
};

function RecipeModal({ recipe, theme: t, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className={`bg-gradient-to-r ${t.gradient} px-6 py-8 rounded-t-3xl sm:rounded-t-2xl`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-5xl mb-3">{recipe.emoji}</div>
              <h2 className="text-2xl font-bold text-white">{recipe.title}</h2>
              <p className="text-white/80 text-sm mt-1">{recipe.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-2xl leading-none ml-4 mt-1"
            >
              ×
            </button>
          </div>
          <div className="flex gap-4 mt-4 text-white/80 text-sm">
            <span>⏱ Prep {recipe.prep_time_minutes}min</span>
            <span>🍳 Cook {recipe.cook_time_minutes}min</span>
            <span>👥 {recipe.servings} servings</span>
            <span className="capitalize">• {recipe.difficulty}</span>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Ingredients */}
          <section>
            <h3 className={`font-bold text-lg mb-3 ${t.accent}`}>Ingredients</h3>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="text-gray-300 select-none">•</span>
                  {ing}
                </li>
              ))}
            </ul>
          </section>

          {/* Steps */}
          <section>
            <h3 className={`font-bold text-lg mb-3 ${t.accent}`}>Instructions</h3>
            <ol className="space-y-4">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-4 text-sm text-gray-700">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${t.tagBg} ${t.tagText}`}>
                    {i + 1}
                  </span>
                  <span className="leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Tips */}
          {recipe.tips && (
            <section className={`${t.tagBg} rounded-xl px-4 py-3`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${t.tagText} mb-1`}>
                Chef's tip
              </p>
              <p className="text-sm text-gray-700">{recipe.tips}</p>
            </section>
          )}

          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-medium text-sm transition ${t.button}`}
          >
            Back to recipes
          </button>
        </div>
      </div>
    </div>
  );
}
