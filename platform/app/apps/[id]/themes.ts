export type Theme = {
  gradient: string;
  headerText: string;
  accent: string;
  tagBg: string;
  tagText: string;
  cardRing: string;
  button: string;
};

export const THEMES: Record<string, Theme> = {
  "Warm Rose": {
    gradient: "from-rose-400 via-pink-500 to-rose-600",
    headerText: "text-white",
    accent: "text-rose-600",
    tagBg: "bg-rose-100",
    tagText: "text-rose-700",
    cardRing: "hover:ring-rose-300",
    button: "bg-rose-500 hover:bg-rose-600 text-white",
  },
  "Ocean Blue": {
    gradient: "from-blue-400 via-cyan-500 to-blue-600",
    headerText: "text-white",
    accent: "text-blue-600",
    tagBg: "bg-blue-100",
    tagText: "text-blue-700",
    cardRing: "hover:ring-blue-300",
    button: "bg-blue-500 hover:bg-blue-600 text-white",
  },
  "Forest Green": {
    gradient: "from-green-500 via-emerald-500 to-teal-600",
    headerText: "text-white",
    accent: "text-emerald-600",
    tagBg: "bg-emerald-100",
    tagText: "text-emerald-700",
    cardRing: "hover:ring-emerald-300",
    button: "bg-emerald-500 hover:bg-emerald-600 text-white",
  },
  "Sunset Orange": {
    gradient: "from-orange-400 via-amber-500 to-orange-600",
    headerText: "text-white",
    accent: "text-orange-600",
    tagBg: "bg-orange-100",
    tagText: "text-orange-700",
    cardRing: "hover:ring-orange-300",
    button: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  "Midnight Purple": {
    gradient: "from-violet-500 via-purple-600 to-indigo-700",
    headerText: "text-white",
    accent: "text-violet-600",
    tagBg: "bg-violet-100",
    tagText: "text-violet-700",
    cardRing: "hover:ring-violet-300",
    button: "bg-violet-500 hover:bg-violet-600 text-white",
  },
};

export const DEFAULT_THEME = THEMES["Warm Rose"];

export function getTheme(name: string): Theme {
  return THEMES[name] ?? DEFAULT_THEME;
}
