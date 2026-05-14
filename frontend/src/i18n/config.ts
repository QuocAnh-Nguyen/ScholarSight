export const LOCALE_STORAGE_KEY = "scholarsight.locale";

export const supportedLocales = [
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { code: "en", label: "English", nativeLabel: "English" },
] as const;

export type SupportedLocale = (typeof supportedLocales)[number]["code"];

export const defaultLocale: SupportedLocale = "vi";
export const fallbackLocale: SupportedLocale = "vi";

export function normalizeLocale(
  input: string | null | undefined,
): SupportedLocale {
  if (!input) return defaultLocale;
  const trimmed = input.trim();
  if (!trimmed) return defaultLocale;

  const exact = supportedLocales.find((locale) => locale.code === trimmed);
  if (exact) return exact.code;

  const base = trimmed.split("-")[0].toLowerCase();
  const baseMatch = supportedLocales.find(
    (locale) => locale.code === base,
  );
  return baseMatch?.code ?? defaultLocale;
}

export function readStoredLocale(): SupportedLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return raw ? normalizeLocale(raw) : null;
  } catch {
    return null;
  }
}

export function detectNavigatorLocale(): SupportedLocale {
  if (typeof navigator === "undefined") return defaultLocale;
  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean);
  for (const locale of candidates) {
    const normalized = normalizeLocale(locale);
    if (normalized) return normalized;
  }
  return defaultLocale;
}

export function resolveInitialLocale(): SupportedLocale {
  return readStoredLocale() ?? detectNavigatorLocale();
}

export function persistLocale(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore storage errors
  }
}

export function applyDocumentLocale(locale: SupportedLocale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}

export function localeOption(locale: SupportedLocale) {
  return supportedLocales.find((entry) => entry.code === locale) ?? supportedLocales[0];
}