// utils/consent.js
export const CONSENT_COOKIE = "mtr_consent";
// structure: { necessary:true, analytics:false, marketing:false, ts:number }

export function readConsent() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find(x => x.startsWith(CONSENT_COOKIE + "="));
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m.split("=")[1])); }
  catch { return null; }
}

export function writeConsent(obj, days = 180) {
  if (typeof document === "undefined") return;
  const v = encodeURIComponent(JSON.stringify({ ...obj, ts: Date.now() }));
  const d = new Date(Date.now() + days*24*60*60*1000).toUTCString();
  document.cookie = `${CONSENT_COOKIE}=${v}; Expires=${d}; Path=/; SameSite=Lax`;
}

export function hasAnswered() {
  const c = readConsent();
  return !!(c && typeof c.necessary === "boolean");
}
