// src/lib/utils.ts
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ------------------ BBCode stripping / cleaning ------------------ */
export function stripBB(s: string): string {
  return s
    .replace(/\[URL=[^\]]+\]([^\[]+)\[\/URL\]/gi, "$1")
    .replace(/\[(?:\/)?(?:SIZE|B|COLOR|TABLE|TR|TD|URL)\b[^\]]*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractURLAndText(cell: string): { text: string; url?: string } {
  const m = cell.match(/\[URL=\"([^\"]+)\"\]([^\[]+)\[\/URL\]/i);
  if (m) return { text: m[2].trim(), url: m[1].trim() };
  return { text: stripBB(cell) };
}

export function cleanRate(token: string): string {
  const t = stripBB(token);
  const m =
    t.match(/(\$?\s*\d{2,4}(?:[.,]\d{2})?)\s*(?:\/?\s*h?r?)?/i) ||
    t.match(/(\$?\s*\d{2,4})/);
  if (!m) return "";
  let out = m[1].replace(/\s+/g, "");
  if (!/\/H$/i.test(out)) out += "/H";
  return out.toUpperCase();
}

/* ------------------ Tag parsing ------------------ */
export function extractHeaderTags(headerCellRaw: string): string[] {
  const hits = [...headerCellRaw.matchAll(/\(\(\(\s*([^)]+?)\s*\)\)\)/g)];
  const tokens = hits.flatMap((m) => m[1].split(/[,\s|/]+/));
  return tokens.map((t) => t.trim().toUpperCase()).filter(Boolean);
}

export function extractTags(
  sourceA: string,
  sourceB?: string,
  headerHints: string[] = []
): string[] {
  const raw = [sourceA, sourceB || ""].map(stripBB).join(" ").toUpperCase();
  const tags: string[] = [];
  const add = (label: string, test: RegExp) => {
    if (test.test(raw) && !tags.includes(label)) tags.push(label);
  };
  add("NEW", /\bNEW\b|NEW!!|NEW!/);
  add("TOP", /\bTOP\b|PREMIUM|ELITE/);
  add("JAV", /\bJAV\b/);
  add("VIP", /\bVIP\b/);
  add("CAME BACK!", /CAME\s*BACK|RETURN|BACK\s*TODAY/);
  add("SPECIAL", /\bSPECIAL\b/);

  headerHints.forEach((h) => {
    const safe = h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`\\b${safe}\\b`);
    if (rx.test(raw) && !tags.includes(h)) tags.push(h);
  });
  return tags;
}

const INLINE_TAG_WORDS = ["new","vip","jav","top","special","premium","came back"];
export function stripInlineTagWords(name: string): string {
  return name
    .replace(new RegExp(`\\b(?:${INLINE_TAG_WORDS.join("|")})\\b`, "gi"), "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* ------------------ Nationality / label helpers ------------------ */
export function normalizeNat(rawNat: string): string {
  return rawNat
    .toLowerCase()
    .replace(/\bnew\b(?!\s*zealand)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const titleize = (s: string) =>
  s.replace(/\b\w/g, (c) => c.toUpperCase());

/* ------------------ Time parsing ------------------ */
export function parseTimeToDate(dayISO: string, timeStr: string): Date | null {
  if (!timeStr) return null;
  let s = timeStr
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ");
  const base = new Date(`${dayISO}T00:00:00`);
  let h = 0, m = 0;

  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  const hhmm = s.match(/^(\d{1,2})(?::(\d{2}))$/);
  const hOnly = s.match(/^(\d{1,2})\s*(am|pm)$/);

  if (ampm) {
    h = +ampm[1];
    m = ampm[2] ? +ampm[2] : 0;
    const ap = ampm[3];
    if (ap === "pm" && h !== 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
  } else if (hOnly) {
    h = +hOnly[1];
    const ap = hOnly[2];
    if (ap === "pm" && h !== 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
  } else if (hhmm) {
    h = +hhmm[1];
    m = hhmm[2] ? +hhmm[2] : 0;
  } else if (/^\d{1,2}$/.test(s)) {
    h = +s;
  } else if (s === "24:00" || s === "24") {
    h = 24;
  } else {
    return null;
  }

  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export const fmtHM = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function buildDateNote(rows: { start?: Date | null; end?: Date | null }[]) {
  const starts = rows.map((r) => r.start).filter(Boolean) as Date[];
  const ends = rows.map((r) => r.end).filter(Boolean) as Date[];
  if (!starts.length || !ends.length) return "";
  const minS = new Date(Math.min(...starts.map((d) => +d)));
  const maxE = new Date(Math.max(...ends.map((d) => +d)));
  const sameDay = minS.toDateString() === maxE.toDateString();
  const s = fmtHM(minS), e = fmtHM(maxE);
  return sameDay ? `${s} - ${e}` : `${s} → next day ${e}`;
}
