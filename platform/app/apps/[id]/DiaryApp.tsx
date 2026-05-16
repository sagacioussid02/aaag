"use client";

import { useState } from "react";
import type { DiaryAppContent, AppConfigEnvelope, MediaRef } from "@/lib/types";
import { getTheme } from "./themes";

type Props = {
  content: DiaryAppContent;
  config:  AppConfigEnvelope;
};

export default function DiaryApp({ content, config }: Props) {
  const t       = getTheme(config.meta.theme);
  const photos  = (config.media.photos ?? []) as MediaRef[];
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className={`bg-gradient-to-br ${t.gradient} px-6 py-16 text-center`}>
        <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-3">
          A gift for {config.meta.recipient_name}
        </p>
        <h1 className="text-4xl font-bold text-white mb-4">
          {content.app_title || config.meta.app_name}
        </h1>
        <p className="text-white/90 text-lg max-w-xl mx-auto leading-relaxed">
          {content.welcome_message}
        </p>

        {content.personal_note && (
          <div className="mt-8 inline-block bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 max-w-md text-left">
            <p className="text-xs text-white/60 font-medium mb-1">A note from the gifter</p>
            <p className="text-white italic text-sm leading-relaxed">
              &ldquo;{content.personal_note}&rdquo;
            </p>
          </div>
        )}
      </header>

      {/* ── Photos + captions ───────────────────────────────────────────────── */}
      {photos.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-12">
          <h2 className={`text-2xl font-bold mb-8 text-center ${t.accent}`}>
            Memories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo, i) => (
              <div
                key={photo.storage_path}
                className="group cursor-pointer"
                onClick={() => setLightbox(i)}
              >
                <div className="relative overflow-hidden rounded-2xl shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.public_url}
                    alt={content.memory_captions?.[i] ?? `Memory ${i + 1}`}
                    className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${t.gradient} opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-2xl`} />
                </div>
                {content.memory_captions?.[i] && (
                  <p className="mt-3 text-sm text-gray-600 text-center italic leading-snug px-2">
                    {content.memory_captions[i]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state if no photos ─────────────────────────────────────────── */}
      {photos.length === 0 && (
        <section className="max-w-xl mx-auto px-6 py-16 text-center">
          <div className={`text-6xl mb-4`}>📔</div>
          <h2 className={`text-xl font-semibold mb-2 ${t.accent}`}>Your personal diary</h2>
          <p className="text-gray-500 text-sm">
            This app was created just for you. More memories will be added over time.
          </p>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="text-center py-10 text-xs text-gray-300">
        Made with love · AaaG
      </footer>

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightbox].public_url}
              alt={content.memory_captions?.[lightbox] ?? `Memory ${lightbox + 1}`}
              className="w-full rounded-2xl shadow-2xl"
            />
            {content.memory_captions?.[lightbox] && (
              <p className="mt-4 text-white/80 text-sm text-center italic">
                {content.memory_captions[lightbox]}
              </p>
            )}

            {/* Prev / Next */}
            <div className="absolute inset-y-0 left-0 flex items-center -ml-12">
              {lightbox > 0 && (
                <button
                  onClick={() => setLightbox((l) => (l ?? 1) - 1)}
                  className="text-white/70 hover:text-white text-3xl font-light leading-none"
                >
                  ‹
                </button>
              )}
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center -mr-12">
              {lightbox < photos.length - 1 && (
                <button
                  onClick={() => setLightbox((l) => (l ?? 0) + 1)}
                  className="text-white/70 hover:text-white text-3xl font-light leading-none"
                >
                  ›
                </button>
              )}
            </div>

            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
