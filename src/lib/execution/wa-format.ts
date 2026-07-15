// Handlebars-lite {{key}} replacement for WhatsApp templates.
// Missing keys render as "—" so the message never breaks.

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    if (v === undefined || v === null || v === "") return "—";
    if (typeof v === "number") return v.toLocaleString("en-IN");
    return String(v);
  });
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return Promise.resolve(false);
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}

export function waDeepLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}