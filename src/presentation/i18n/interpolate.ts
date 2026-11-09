export type MessageParams = Readonly<Record<string, string | number>>;

/** Replaces `{name}` placeholders with params. Unknown placeholders stay as written. */
export function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole,
  );
}
