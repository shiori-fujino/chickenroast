import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { Image as ImageIcon } from "lucide-react";
import { toPng } from "html-to-image";

/* ------------------ Theme presets (unchanged behavior) ------------------ */
type ThemeKey =
  | "amber" | "gold" | "tangerine" | "rose" | "magenta" | "violet"
  | "cobalt" | "cyan" | "teal" | "emerald" | "lime" | "slate";

const THEMES: Record<
  ThemeKey,
  { accent: string; bg: string; ink: string; muted: string; hair: string; dot: string }
> = {
  amber:   { accent:"#FFB020", bg:"#0B0B0C", ink:"#FFF8E7", muted:"#FFD580", hair:"#33240A", dot:"rgba(255,200,100,.35)" },
  gold:    { accent:"#FFD700", bg:"#0B0B0C", ink:"#FFFDF0", muted:"#FFE680", hair:"#3A2E00", dot:"rgba(255,220,120,.35)" },
  tangerine:{ accent:"#FF6B00", bg:"#0B0B0C", ink:"#FFF5EE", muted:"#FFB380", hair:"#331600", dot:"rgba(255,180,120,.35)" },
  rose:    { accent:"#FF2E63", bg:"#0B0B0C", ink:"#FFF0F5", muted:"#FF99B5", hair:"#33111D", dot:"rgba(255,120,160,.35)" },
  magenta: { accent:"#FF00AA", bg:"#0A0A11", ink:"#FFF0FA", muted:"#FF99DD", hair:"#330033", dot:"rgba(255,100,220,.35)" },
  violet:  { accent:"#8B5CFF", bg:"#100A1C", ink:"#F5F0FF", muted:"#C9A8FF", hair:"#2E1A50", dot:"rgba(190,150,255,.35)" },
  cobalt:  { accent:"#2563EB", bg:"#08101E", ink:"#EFF6FF", muted:"#93C5FD", hair:"#12264D", dot:"rgba(120,170,255,.35)" },
  cyan:    { accent:"#06B6D4", bg:"#061116", ink:"#E0FCFF", muted:"#67E8F9", hair:"#09343D", dot:"rgba(100,220,255,.35)" },
  teal:    { accent:"#0D9488", bg:"#061311", ink:"#E6FFFB", muted:"#5EEAD4", hair:"#0D3B34", dot:"rgba(90,230,210,.35)" },
  emerald: { accent:"#10B981", bg:"#07110D", ink:"#ECFDF5", muted:"#6EE7B7", hair:"#0E3B2D", dot:"rgba(90,230,170,.35)" },
  lime:    { accent:"#84CC16", bg:"#0B1205", ink:"#F7FFE8", muted:"#C5F566", hair:"#1E3100", dot:"rgba(170,255,120,.35)" },
  slate:   { accent:"#64748B", bg:"#0B0C0F", ink:"#F2F4F8", muted:"#A5B4CC", hair:"#2C3240", dot:"rgba(170,190,210,.40)" },
};
type Theme = (typeof THEMES)[ThemeKey];

/* ------------------ Helpers (unchanged behavior) ------------------ */
function stripBB(s: string): string {
  return s
    .replace(/\[URL=[^\]]+\]([^\[]+)\[\/URL\]/gi, "$1")
    .replace(/\[(?:\/)?(?:SIZE|B|COLOR|TABLE|TR|TD|URL)\b[^\]]*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
function extractURLAndText(cell: string): { text: string; url?: string } {
  const m = cell.match(/\[URL=\"([^\"]+)\"\]([^\[]+)\[\/URL\]/i);
  if (m) return { text: m[2].trim(), url: m[1].trim() };
  return { text: stripBB(cell) };
}
function cleanRate(token: string): string {
  const t = stripBB(token);
  const m =
    t.match(/(\$?\s*\d{2,4}(?:[.,]\d{2})?)\s*(?:\/?\s*h?r?)?/i) ||
    t.match(/(\$?\s*\d{2,4})/);
  if (!m) return "";
  let out = m[1].replace(/\s+/g, "");
  if (!/\/H$/i.test(out)) out += "/H";
  return out.toUpperCase();
}
function extractHeaderTags(headerCellRaw: string): string[] {
  const hits = [...headerCellRaw.matchAll(/\(\(\(\s*([^)]+?)\s*\)\)\)/g)];
  const tokens = hits.flatMap((m) => m[1].split(/[,\s|/]+/));
  return tokens.map((t) => t.trim().toUpperCase()).filter(Boolean);
}
function extractTags(sourceA: string, sourceB?: string, headerHints: string[] = []): string[] {
  const raw = [sourceA, sourceB || ""].map(stripBB).join(" ").toUpperCase();
  const tags: string[] = [];
  const add = (label: string, test: RegExp) => { if (test.test(raw) && !tags.includes(label)) tags.push(label); };
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
const INLINE_TAG_WORDS = ["new","vip","jav","top","special","premium", "came back"];
function stripInlineTagWords(name: string): string {
  return name.replace(new RegExp(`\\b(?:${INLINE_TAG_WORDS.join("|")})\\b`, "gi"), "")
             .replace(/\s{2,}/g, " ").trim();
}
function normalizeNat(rawNat: string): string {
  return rawNat.toLowerCase().replace(/\bnew\b(?!\s*zealand)\b/g, "").replace(/\s+/g, " ").trim();
}
const titleize = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

function parseTimeToDate(dayISO: string, timeStr: string): Date | null {
  if (!timeStr) return null;
  let s = timeStr.trim().toLowerCase().replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ");
  const base = new Date(`${dayISO}T00:00:00`);
  let h = 0, m = 0;
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  const hhmm = s.match(/^(\d{1,2})(?::(\d{2}))$/);
  const hOnly = s.match(/^(\d{1,2})\s*(am|pm)$/);
  if (ampm) { h = +ampm[1]; m = ampm[2] ? +ampm[2] : 0; const ap = ampm[3]; if (ap==="pm"&&h!==12) h+=12; if (ap==="am"&&h===12) h=0; }
  else if (hOnly) { h = +hOnly[1]; const ap = hOnly[2]; if (ap==="pm"&&h!==12) h+=12; if (ap==="am"&&h===12) h=0; }
  else if (hhmm) { h = +hhmm[1]; m = hhmm[2] ? +hhmm[2] : 0; }
  else if (/^\d{1,2}$/.test(s)) { h = +s; }
  else if (s === "24:00" || s === "24") { h = 24; }
  else { return null; }
  const d = new Date(base); d.setHours(h, m, 0, 0); return d;
}
const fmtHM = (d: Date) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
function buildDateNote(rows: {start?: Date|null; end?: Date|null}[]) {
  const starts = rows.map(r => r.start).filter(Boolean) as Date[];
  const ends   = rows.map(r => r.end).filter(Boolean) as Date[];
  if (!starts.length || !ends.length) return "";
  const minS = new Date(Math.min(...starts.map(d=>+d)));
  const maxE = new Date(Math.max(...ends.map(d=>+d)));
  const sameDay = minS.toDateString() === maxE.toDateString();
  const s = fmtHM(minS), e = fmtHM(maxE);
  return sameDay ? `${s} - ${e}` : `${s} → next day ${e}`;
}

/* ------------------ Types ------------------ */
interface Row {
  name: string;
  natKey: string;
  start?: Date | null;
  end?: Date | null;
  timeLabel: string;
  rate?: string;
  tags: string[];
}
interface Group { key: string; rows: Row[]; }

/* ------------------ Poster ------------------ */
function PosterSingle({
  title, shop, groups, theme, dateNote = "",
}: {
  title: string; shop: string; groups: Group[];
  theme: Theme; dateNote?: string;
}) {
  const POSTER_W = 360;
  const cssVars: CSSProperties & Record<string, string> = {
    "--poster-w": `${POSTER_W}px`,
    "--accent": theme.accent,
    "--bg": theme.bg,
    "--ink": theme.ink,
    "--muted": theme.muted,
    "--hair": theme.hair,
    "--dot": theme.dot,
  };

  return (
    <div style={cssVars}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .poster1{
            max-width:100%;         /* instead of fixed 360px */
            width:100%;             /* fluid */
            margin:0 auto;
            background:var(--bg);
            border:1px solid #000;
            border-radius:16px;
            overflow:hidden;
            position:relative;
            box-shadow:0 20px 50px rgba(0,0,0,.5);
            color:var(--ink)
          }


          .poster1 .content{padding:24px}
          .poster1 .title{text-align:center;margin-bottom:16px}
          .poster1 .title h1{margin:0;font-weight:900;letter-spacing:.02em;line-height:1.4;font-size:24px}
          .poster1 .subtitle{margin-top:.35rem;color:var(--muted);font-size:12px}
          .poster1 .center-band{margin:16px auto;text-align:center;color:#e6e7ea}
          .poster1 .center-band .line{height:1px;background:linear-gradient(to right,transparent,var(--dot),transparent)}
          .poster1 .center-band .label{font-weight:900;letter-spacing:.12em;font-size:12px;margin:.5rem 0 .4rem}
          .poster1 .section{
            margin-bottom:28px;     /* more space between nationality groups */
            padding:0 4px;
          }          .poster1 .heading{font-weight:900;letter-spacing:.06em;text-transform:uppercase;font-size:16px;position:relative;padding-bottom:.6rem;margin-bottom:.5rem}
          .poster1 .heading:after{content:"";position:absolute;left:0;right:52%;bottom:0;height:4px;background:var(--accent);border-radius:2px}
          .poster1 .row{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--hair);font-size:14px}
          .poster1 .left{font-weight:800;letter-spacing:.2px}
          .poster1 .time{display:block;color:var(--muted);font-weight:500;font-size:.88em;margin-top:2px}
          .poster1 .dots{align-self:center;height:2px;width:100%;background-image:radial-gradient(var(--dot) 1px, transparent 1px);background-size:6px 2px;background-repeat:repeat-x}
          .poster1 .price{font-weight:900;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--accent);font-size:16px}
          .poster1 .tags{display:inline-flex;gap:.35rem;margin-left:.5rem;flex-wrap:wrap}
          .poster1 .tag{display:inline-block;padding:.18rem .42rem;border-radius:6px;font-weight:900;font-size:.72em;line-height:1;color:var(--accent);border:1px solid var(--accent)}
        `,
        }}
      />
      <div className="poster1">
        <div className="content">
          <div className="title">
            <h1>{title}</h1>
            {dateNote ? <div className="subtitle">{dateNote}</div> : null}
          </div>

          <div className="center-band" aria-hidden="true">
            <div className="line" />
            <div className="label">{shop || "shop name goes here"}</div>
            <div className="line" />
          </div>

          <div>
            {groups.map((g) => (
              <section key={g.key} className="section">
                <div className="heading">{titleize(g.key)}</div>
                {g.rows.map((r, idx) => {
                  const hasRate = !!r.rate;
                  return (
                    <div
                      key={g.key + idx}
                      className="row"
                      style={{ gridTemplateColumns: hasRate ? "auto 1fr auto" : "auto 1fr" }}
                    >
                      <div className="left">
                        {r.name}
                        {r.tags?.length ? (
                          <span className="tags">
                            {r.tags.map((t, i) => (
                              <span key={t + i} className="tag">{t}</span>
                            ))}
                          </span>
                        ) : null}
                        <span className="time">{r.timeLabel}</span>
                      </div>
                      <div className="dots" style={{ display: hasRate ? "block" : "none" }} />
                      {hasRate ? <div className="price">{r.rate}</div> : null}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Main ------------------ */
export default function RosterBBApp() {
  const [raw, setRaw] = useState(`
[TABLE]
[TR]
[TD][B][SIZE=4]Wednesday[/SIZE][/B][/TD]
[TD][SIZE=4][COLOR=#000000]10/9/2025[/COLOR][/SIZE][/TD]
[/TR]
[/TABLE]

[TABLE]
[TR]
[TD][SIZE=3]Nationality[/SIZE][/TD]
[TD][SIZE=3]Name (((NEW)))[/SIZE][/TD]
[TD][SIZE=3]Start[/SIZE][/TD]
[TD][SIZE=3]Finish[/SIZE][/TD]
[TD][SIZE=3]Service[/SIZE][/TD]
[/TR]
[TR]
[TD]Indonesian[/TD]
[TD][URL="https://no5marrickville.com/profile/hazel/?utm_source=a99"]Hazel new[/URL][/TD]
[TD]10 am[/TD]
[TD]10 pm[/TD]
[TD]$300[/TD]
[/TR]
[TR]
[TD]Japanese[/TD]
[TD][URL="https://no5marrickville.com/profile/hinata-1/?utm_source=a99"]Hinata vip[/URL][/TD]
[TD]10 am[/TD]
[TD]10 pm[/TD]
[TD]300/hr[/TD]
[/TR]
[/TABLE]`);

  const [title, setTitle] = useState("Wednesday 10/9/2025");
  const [shop, setShop] = useState("No.5 Marrickville");
  const [themeKey, setThemeKey] = useState<ThemeKey>("amber");
  const exportRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => {
    const isTable = /\[TABLE\]/i.test(raw);
  
    if (isTable) {
      // ---- Marrickville table parser ----
      const dateMatch = raw.match(/\](\d{1,2}\/\d{1,2}\/\d{4})\[/);
      let dayISO = "2025-09-06";
      if (dateMatch) {
        const [d, m, y] = dateMatch[1].split("/").map(Number);
        dayISO = new Date(y, m - 1, d).toISOString().slice(0, 10);
      }
      const weekdayMatch = raw.match(/\[SIZE=4\](Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\[\/SIZE\]/i);
      const autoTitle = weekdayMatch && dateMatch ? `${weekdayMatch[1]} ${dateMatch[1]}` : title;
  
      const trs = [...raw.matchAll(/\[TR\]([\s\S]*?)\[\/TR\]/gi)].map((m) => m[1] || "");
      const headIdx = trs.findIndex((tr) => /\[SIZE=3\]/i.test(tr));
      const header = headIdx >= 0 ? trs[headIdx] : trs[0] || "";
  
      const headCellsRaw = [...header.matchAll(/\[TD[^\]]*\]([\s\S]*?)\[\/TD\]/gi)].map((m) => m[1] || "");
      const headCells = headCellsRaw.map((c) => stripBB(c).toLowerCase());
  
      const col = {
        nationality: headCells.findIndex((h) => /nation/i.test(h)),
        name:        headCells.findIndex((h) => /name/i.test(h)),
        start:       headCells.findIndex((h) => /start/i.test(h)),
        finish:      headCells.findIndex((h) => /finish/i.test(h)),
        time:        headCells.findIndex((h) => /^time$/i.test(h)),
        rate:        headCells.findIndex((h) => /rate/i.test(h)),
        service:     headCells.findIndex((h) => /service/i.test(h)),
      };
  
      const nameHeaderRaw = headCellsRaw[col.name >= 0 ? col.name : 1] || "";
      const headerNameTags = extractHeaderTags(nameHeaderRaw);
  
      const rows: Row[] = [];
      trs.forEach((tr, i) => {
        if (i <= headIdx) return;
        const tds = [...tr.matchAll(/\[TD[^\]]*\]([\s\S]*?)\[\/TD\]/gi)].map((m) => m[1] || "");
        if (!tds.length) return;
  
        const natKey = normalizeNat(stripBB(tds[col.nationality >= 0 ? col.nationality : 0] || ""));
        const nameIdx = col.name >= 0 ? col.name : 1;
        const { text: rawName } = extractURLAndText(tds[nameIdx] || "");
        const nameText = stripInlineTagWords(rawName);
  
        let startS = "", finishS = "", timeLabel = "";
        if (col.time >= 0) {
          timeLabel = stripBB(tds[col.time] || "").replace(/\s*–\s*/g, " - ").replace(/\s+/g, " ").trim();
          const seg = timeLabel.split(/\s*-\s*/);
          startS = seg[0] || ""; finishS = seg[1] || "";
        } else {
          startS = stripBB(tds[col.start >= 0 ? col.start : 2] || "");
          finishS = stripBB(tds[col.finish >= 0 ? col.finish : 3] || "");
          timeLabel = `${startS} - ${finishS}`.replace(/\s+/g, " ").trim();
        }
  
        const serviceCell = col.service >= 0 ? (tds[col.service] || "") : "";
        const rateFromRate = col.rate >= 0 ? cleanRate(tds[col.rate] || "") : "";
        const rateFromSvc  = cleanRate(serviceCell);
        const rate = (rateFromRate || rateFromSvc) || undefined;
  
        const tags = extractTags(serviceCell, tds[nameIdx] || "", headerNameTags);
  
        const start = parseTimeToDate(dayISO, startS);
        let end = parseTimeToDate(dayISO, finishS);
        if (start && end && end <= start) end = new Date(end.getTime() + 24 * 3600 * 1000);
  
        rows.push({ name: nameText, natKey, start, end, timeLabel, rate, tags });
      });
  
      const grouped: Record<string, Row[]> = {};
      const order: string[] = [];
      for (const r of rows) {
        const k = r.natKey || "others";
        if (!grouped[k]) { grouped[k] = []; order.push(k); }
        grouped[k].push(r);
      }
      const groups: Group[] = order.map((k) => ({ key: k, rows: grouped[k] }));
      const dateNote = buildDateNote(rows);
      return { title: autoTitle, groups, flat: rows, dateNote };
    }
  
// ---- Nightshade line parser ----
const rows: Row[] = [];
raw.split("\n").forEach(line => {
  const m = line.match(
    /^\(([^)]+)\)\s*(?:\[COLOR=[^\]]+\])?\s*([^\d]+?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*-\s*([0-9: ]+(?:am|pm)?)(?:\[\/COLOR\])?(?:\s+(.+))?$/i
  );
  if (m) {
    const nat = m[1].trim();                // e.g. Japan
    const rawName = m[2].trim();            // e.g. Aoi NEW
    const start = m[3].trim();              // e.g. 12pm
    const end = m[4].trim();                // e.g. 10pm
    const maybeRate = m[5] ? cleanRate(m[5]) : undefined;

    // 🔑 Use existing helpers
    const name = stripInlineTagWords(rawName);  // strip "new", "vip" from display name
    const tags = extractTags(line);             // detect NEW / VIP / CAME BACK / etc.

    rows.push({
      natKey: nat,
      name,
      start: null,
      end: null,
      timeLabel: `${start} - ${end}`,
      rate: maybeRate,
      tags,
    });
  }
});

  
    const grouped: Record<string, Row[]> = {};
    const order: string[] = [];
    for (const r of rows) {
      const k = r.natKey || "others";
      if (!grouped[k]) { grouped[k] = []; order.push(k); }
      grouped[k].push(r);
    }
    const groups: Group[] = order.map((k) => ({ key: k, rows: grouped[k] }));
    return { title, groups, flat: rows, dateNote: "" };
  
  }, [raw, title]);
    
  async function exportPNG() {
    if (!exportRef.current) return;
    const node = exportRef.current as HTMLElement;
    try { await (document as any).fonts?.ready; } catch {}
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const width  = Math.ceil(node.getBoundingClientRect().width);
    const height = Math.ceil(node.scrollHeight);
    const prevW = node.style.width, prevH = node.style.height;
    node.style.width = width + "px";
    node.style.height = height + "px";

    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "transparent",
        width, height,
        style: { transform: "none", transformOrigin: "left top", position: "static", overflow: "visible" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${(parsed.title || "poster").replace(/\s+/g, "_")}.png`;
      a.click();
    } finally {
      node.style.width = prevW;
      node.style.height = prevH;
    }
  }

  const theme = THEMES[themeKey];

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Roster BBCode → Poster PNG</h1>
          <p className="text-sm text-neutral-600">Slim single column • Header (((TAG))) • Styled closer to original HTML.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPNG} className="rounded-2xl" title="Export PNG">
            <ImageIcon className="w-4 h-4 mr-2" /> PNG
          </Button>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <Card className="shadow-sm rounded-2xl">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Wednesday 10/9/2025" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop">Center label (shop / venue)</Label>
              <Input id="shop" value={shop}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setShop(e.target.value)}
                placeholder="shop name goes here" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <select
                id="theme"
                value={themeKey}
                onChange={(e) => setThemeKey(e.target.value as ThemeKey)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              >
                {Object.keys(THEMES).map(k => (
                  <option key={k} value={k}>{k[0].toUpperCase()+k.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="raw">BBCode input</Label>
              <Textarea id="raw" rows={18} value={raw}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRaw(e.target.value)}
                placeholder="Paste your [TABLE]... BBCode here" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div ref={exportRef}>
              <PosterSingle
                title={parsed.title || title}
                shop={shop}
                groups={parsed.groups}
                theme={theme}
                dateNote={parsed.dateNote}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center text-xs text-neutral-500 mt-2">
        Poster width fixed at 360px. PNG export via html-to-image.
      </footer>
    </div>
  );
                }