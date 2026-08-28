const DIACRITICS_RE = /[̀-ͯ]/g;

export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = Math.random().toString(36).slice(2, 6);

  return `${base || "empresa"}-${suffix}`;
}
