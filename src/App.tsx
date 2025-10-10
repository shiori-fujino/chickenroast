import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { Image as ImageIcon } from "lucide-react";
import { toPng } from "html-to-image";

/* ------------------ Theme presets ------------------ */
type ThemeKey =
  | "amber" | "rose" | "sapphire" | "jade" | "mint" | "violet"
  | "burgundy" | "copper" | "cyan" | "pearl" | "slate" | "luxegold"
  | "turquoise" | "coral" | "olive" | "charcoal" | "ivory"
  | "champagne" | "platinum" | "onyx" | "turmeric" | "azure";

const THEMES: Record<
  ThemeKey,
  { accent: string; bg: string; ink: string; muted: string; hair: string; dot: string }
> = {
  luxegold:{ accent:"#D4AF37", bg:"#1C1C1C", ink:"#E6D5B8", muted:"#B8A77D", hair:"#000000", dot:"rgba(212,175,55,.25)" },
  amber:{ accent:"#FFB020", bg:"#1C1C1C", ink:"#FFF8E7", muted:"#FFD580", hair:"#33240A", dot:"rgba(255,200,100,.25)" },
  rose:{ accent:"#FF2E63", bg:"#1C1C1C", ink:"#FFF0F5", muted:"#FF99B5", hair:"#33111D", dot:"rgba(255,120,160,.25)" },
  violet:{ accent:"#8B5CFF", bg:"#1C1C1C", ink:"#F5F0FF", muted:"#C9A8FF", hair:"#2E1A50", dot:"rgba(190,150,255,.25)" },
  sapphire:{ accent:"#4169E1", bg:"#1C1C1C", ink:"#EAF0FF", muted:"#A8B8E6", hair:"#1C294D", dot:"rgba(65,105,225,.25)" },
  cyan:{ accent:"#06B6D4", bg:"#1C1C1C", ink:"#E0FCFF", muted:"#67E8F9", hair:"#09343D", dot:"rgba(100,220,255,.25)" },
  jade:{ accent:"#00A86B", bg:"#1C1C1C", ink:"#E6FFF5", muted:"#99E6C8", hair:"#004D33", dot:"rgba(0,168,107,.25)" },
  mint:{ accent:"#3EB489", bg:"#1C1C1C", ink:"#EDFFF9", muted:"#AAE6D1", hair:"#1E4D3D", dot:"rgba(62,180,137,.25)" },
  burgundy:{ accent:"#800020", bg:"#1C1C1C", ink:"#FDEDF0", muted:"#D9A8B8", hair:"#33000D", dot:"rgba(128,0,32,.25)" },
  copper:{ accent:"#B87333", bg:"#1C1C1C", ink:"#FFF5EB", muted:"#E6C4A8", hair:"#4D2E1A", dot:"rgba(184,115,51,.25)" },
  pearl:{ accent:"#E8E4D8", bg:"#1C1C1C", ink:"#FAFAF7", muted:"#D6D2C8", hair:"#3D3B36", dot:"rgba(232,228,216,.25)" },
  slate:{ accent:"#64748B", bg:"#1C1C1C", ink:"#F2F4F8", muted:"#A5B4CC", hair:"#2C3240", dot:"rgba(170,190,210,.30)" },
  turquoise:{ accent:"#40E0D0", bg:"#1C1C1C", ink:"#E6FFFF", muted:"#A8E6E0", hair:"#104D4D", dot:"rgba(64,224,208,.25)" },
  coral:{ accent:"#FF7F50", bg:"#1C1C1C", ink:"#FFF3ED", muted:"#FFC4B0", hair:"#662B1F", dot:"rgba(255,127,80,.25)" },
  olive:{ accent:"#808000", bg:"#1C1C1C", ink:"#F7F7E0", muted:"#D6D6A8", hair:"#333311", dot:"rgba(128,128,0,.25)" },
  charcoal:{ accent:"#36454F", bg:"#1C1C1C", ink:"#E8EEF2", muted:"#A8B3B8", hair:"#12191C", dot:"rgba(54,69,79,.25)" },
  ivory:{ accent:"#FFFFF0", bg:"#1C1C1C", ink:"#FFFFFF", muted:"#E6E6D6", hair:"#4D4D40", dot:"rgba(255,255,240,.25)" },
  champagne:{ accent:"#F7E7CE", bg:"#1C1C1C", ink:"#FFFAF0", muted:"#E6D6B8", hair:"#4D4233", dot:"rgba(247,231,206,.25)" },
  platinum:{ accent:"#E5E4E2", bg:"#1C1C1C", ink:"#FFFFFF", muted:"#CCCCCC", hair:"#333333", dot:"rgba(229,228,226,.25)" },
  onyx:{ accent:"#353839", bg:"#1C1C1C", ink:"#EAEAEA", muted:"#B8B8B8", hair:"#111111", dot:"rgba(53,56,57,.25)" },
  turmeric:{ accent:"#CC7722", bg:"#1C1C1C", ink:"#FFF5E6", muted:"#E6B588", hair:"#4D2E0D", dot:"rgba(204,119,34,.25)" },
  azure:{ accent:"#007FFF", bg:"#1C1C1C", ink:"#E6F5FF", muted:"#99CCFF", hair:"#00334D", dot:"rgba(0,127,255,.25)" },
};
type Theme = (typeof THEMES)[ThemeKey];

/* ------------------ Types ------------------ */
interface Row {
  name: string;
  natKey: string;
  timeLabel: string;
  price: string;
  tags: string[];
}
interface Group { key: string; rows: Row[]; }

/* ------------------ Helpers ------------------ */

function normalizeNat(raw: string) {
  const cleaned = raw.toLowerCase().trim();
  if (cleaned.startsWith("new zealand")) {
    return "new zealand";
  }
  return cleaned;
}

function extractTags(source: string): string[] {
  const raw = source.toUpperCase();
  const tags: string[] = [];
  if (/\bNEW\b/.test(raw) && !/\bNEW\s+ZEALAND\b/.test(raw)) tags.push("NEW");
  if (/\bPOPULAR\b/.test(raw)) tags.push("POPULAR");
  if (/\bGFE\b/.test(raw)) tags.push("GFE");
  if (/\bPSE\b/.test(raw)) tags.push("PSE");
  if (/\bJAV\b/.test(raw)) tags.push("JAV");
  if (/\bSHE'S\s*BACK\b/.test(raw) || /\bRETURN\b/.test(raw) || /\bCAME\s+BACK\b/.test(raw)) {
    tags.push("SHE'S BACK!");
  }
  if (/\bLAST\s+DAY\b/.test(raw)) tags.push("LAST DAY");
  if (/\bFIRST\s+DAY\b/.test(raw)) tags.push("FIRST DAY");
  return tags;
}

const INLINE_TAG_WORDS = [
  "new","gfe","jav","pse","popular","she's back","last day","first day"
];

function stripInlineTagWords(s: string): string {
  return s
    .replace(/\bNew\s+Zealand\b/gi, "NZPLACEHOLDER")
    .replace(new RegExp(`\\b(?:${INLINE_TAG_WORDS.join("|")})\\b`, "gi"), "")
    .replace(/NZPLACEHOLDER/g, "New Zealand")
    .replace(/[!?.]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* ------------------ Poster ------------------ */
function PosterSingle({
  title, shop, groups, theme,
}: {
  title: string; shop: string; groups: Group[];
  theme: Theme;
}) {
  const cssVars: CSSProperties & Record<string, string> = {
    "--accent": theme.accent,
    "--bg": theme.bg,
    "--ink": theme.ink,
    "--muted": theme.muted,
    "--hair": theme.hair,
    "--dot": theme.dot,
  };
  return (
    <div style={cssVars} className="poster-page">
      <style dangerouslySetInnerHTML={{__html:`
        .poster1{max-width:100%;margin:0 auto;background:var(--bg);color:var(--ink);border:none;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4)}
        .poster1 .content{padding:20px}
        .poster1 .title{text-align:center;margin-bottom:12px}
        .poster1 .title h1{margin:0;font-weight:900;font-size:22px}
        .poster1 .center-band{margin:12px auto;text-align:center;color:var(--muted)}
        .poster1 .center-band .line{height:1px;background:linear-gradient(to right,transparent,var(--dot),transparent)}
        .poster1 .center-band .label{font-weight:700;letter-spacing:.12em;font-size:12px;margin:.3rem 0}
        .poster1 .section{margin-bottom:18px}
        .poster1 .row{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--hair);font-size:13px}
        .poster1 .left{font-weight:700;flex:1}
        .poster1 .nat{display:inline-block;margin-right:6px;color:var(--muted);font-weight:600;font-size:.75em;text-transform:capitalize}
        .poster1 .time{margin-left:6px;color:var(--muted);font-weight:500;font-size:.75em;flex:0 0 80px;text-align:right;white-space:nowrap}
        .poster1 .price{margin-left:10px;color:var(--ink);font-weight:600;font-size:.9em;flex:1;text-align:right}
        .poster1 .tags{display:inline-flex;gap:.35rem;margin-left:.5rem;flex-wrap:wrap}
        .poster1 .tag{display:inline-block;padding:.15rem .4rem;border-radius:4px;font-weight:800;font-size:.7em;color:var(--accent);border:1px solid var(--accent)}
        .poster1 .tag-firstday{color:#50C878 !important;border-color:#50C878 !important;text-shadow:0 0 6px rgba(57,255,20,0.8)}
        .poster1 .tag-lastday{color:#D946EF !important;border-color:#D946EF !important;text-shadow:0 0 6px rgba(255,0,255,0.8)}
      `}} />
      <div className="poster1">
        <div className="content">
          <div className="title"><h1>{title || " "}</h1></div>
          <div className="center-band" aria-hidden="true">
            <div className="line" />
            <div className="label">{shop || " "}</div>
            <div className="line" />
          </div>
          {groups.map((g) => (
            <section key={g.key} className="section">
              {g.rows.map((r, idx) => (
                <div key={g.key+idx} className="row">
                  <div className="left">
                    <span className="nat">{r.natKey}</span>
                    {r.name}
                    {r.tags?.length ? (
                      <span className="tags">
                        {r.tags.map((t, i) => (
                          <span 
                            key={t+i} 
                            className={`tag ${t === "FIRST DAY" ? "tag-firstday" : t === "LAST DAY" ? "tag-lastday" : ""}`}
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <div className="time">{r.timeLabel}</div>
                  <div className="price">{r.price}</div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------ Main ------------------ */
export default function RosterBBApp() {
  const [raw, setRaw] = useState("");
  const [title, setTitle] = useState("");
  const [shop, setShop] = useState("");
  const [themeKey, setThemeKey] = useState<ThemeKey>("luxegold");

  const parsed = useMemo(() => {
    const rows: Row[] = [];
    const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length);

    if (lines.length && /^\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+[A-Za-z]+)?$/i.test(lines[0])) {
      lines.shift();
    }

    lines.forEach(line => {
      const parts = line.split(/\t+|\s{2,}/).map(p => p.trim());
      if (parts.length >= 5) {
        const natKey = normalizeNat(stripInlineTagWords(parts[0]));
        const rawName = parts[1];
        const name = stripInlineTagWords(rawName);
        const start = parts[2];
        const finish = parts[3];
        const price = parts[4];
        const timeLabel = `${start} - ${finish}`;
        const tags = extractTags(line);
        rows.push({ natKey, name, timeLabel, price, tags });
        return;
      }

      const m = line.match(
        /^\(([^)]+)\)\s*([A-Za-z0-9 ]+)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*-\s*([\d: ]+(?:am|pm)?)/i
      );
      if (m) {
        const natKey = normalizeNat(m[1]);
        const rawName = m[2].trim();
        const name = stripInlineTagWords(rawName);
        const start = m[3].trim(), finish = m[4].trim();
        const timeLabel = `${start} - ${finish}`;
        const priceMatch = line.match(/(\d{2,3})\s*\/\s*HR/i);
        const price = priceMatch ? `${priceMatch[1]}/HR` : "";
        const tags = extractTags(line);
        rows.push({ natKey, name, timeLabel, price, tags });
      }
    });

    return rows;
  }, [raw]);

  const groups: Group[] = [{ key:"all", rows: parsed }];

  async function exportPNG() {
    const node = document.querySelector(".poster-page") as HTMLElement | null;
    if (!node) return;
    const width = node.scrollWidth, height = node.scrollHeight;
    const dataUrl = await toPng(node,{pixelRatio:3,cacheBust:true,width,height});
    const a=document.createElement("a");
    a.href=dataUrl;
    a.download=`${title.replace(/\s+/g,"_") || "poster"}.png`;
    a.click();
  }

  return (
    <div className="min-h-screen w-screen bg-neutral-100 text-neutral-900 flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Roster Parser → Poster</h1>
        <Button onClick={exportPNG}><ImageIcon className="w-4 h-4 mr-2"/> Export PNG</Button>
      </header>

      <Label>Theme</Label>
      <select
        className="theme-select"
        value={themeKey}
        onChange={e => setThemeKey(e.target.value as ThemeKey)}
      >
        {Object.keys(THEMES).map(k => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>

      <div className="grid md:grid-cols-2 gap-6">
        <Card><CardContent className="p-4 space-y-4">
          <Label>Title</Label>
          <Input value={title} onChange={e=>setTitle(e.target.value)} />
          <Label>Shop</Label>
          <Input value={shop} onChange={e=>setShop(e.target.value)} />
          <Label>Roster Input</Label>
          <Textarea rows={18} value={raw} onChange={e=>setRaw(e.target.value)} />
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <PosterSingle
            title={title}
            shop={shop}
            groups={groups}
            theme={THEMES[themeKey]}
          />
        </CardContent></Card>
      </div>
    </div>
  );
}
