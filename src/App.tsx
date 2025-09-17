import { useMemo, useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { Image as ImageIcon, Shuffle as ShuffleIcon } from "lucide-react";
import { toPng } from "html-to-image";

/* ------------------ Theme presets ------------------ */
type ThemeKey =
  | "amber" | "gold" | "tangerine" | "rose" | "magenta" | "violet"
  | "cobalt" | "cyan" | "teal" | "emerald" | "lime" | "slate" | "luxegold";

const THEMES: Record<
  ThemeKey,
  { accent: string; bg: string; ink: string; muted: string; hair: string; dot: string }
> = {
  amber:   { accent:"#FFB020", bg:"#1C1C1C", ink:"#FFF8E7", muted:"#FFD580", hair:"#33240A", dot:"rgba(255,200,100,.25)" },
  gold:    { accent:"#FFD700", bg:"#1C1C1C", ink:"#FFFDF0", muted:"#FFE680", hair:"#3A2E00", dot:"rgba(255,220,120,.25)" },
  tangerine:{ accent:"#FF6B00", bg:"#1C1C1C", ink:"#FFF5EE", muted:"#FFB380", hair:"#331600", dot:"rgba(255,180,120,.25)" },
  rose:    { accent:"#FF2E63", bg:"#1C1C1C", ink:"#FFF0F5", muted:"#FF99B5", hair:"#33111D", dot:"rgba(255,120,160,.25)" },
  magenta: { accent:"#FF00AA", bg:"#1C1C1C", ink:"#FFF0FA", muted:"#FF99DD", hair:"#330033", dot:"rgba(255,100,220,.25)" },
  violet:  { accent:"#8B5CFF", bg:"#1C1C1C", ink:"#F5F0FF", muted:"#C9A8FF", hair:"#2E1A50", dot:"rgba(190,150,255,.25)" },
  cobalt:  { accent:"#2563EB", bg:"#1C1C1C", ink:"#EFF6FF", muted:"#93C5FD", hair:"#12264D", dot:"rgba(120,170,255,.25)" },
  cyan:    { accent:"#06B6D4", bg:"#1C1C1C", ink:"#E0FCFF", muted:"#67E8F9", hair:"#09343D", dot:"rgba(100,220,255,.25)" },
  teal:    { accent:"#0D9488", bg:"#1C1C1C", ink:"#E6FFFB", muted:"#5EEAD4", hair:"#0D3B34", dot:"rgba(90,230,210,.25)" },
  emerald: { accent:"#10B981", bg:"#1C1C1C", ink:"#ECFDF5", muted:"#6EE7B7", hair:"#0E3B2D", dot:"rgba(90,230,170,.25)" },
  lime:    { accent:"#84CC16", bg:"#1C1C1C", ink:"#F7FFE8", muted:"#C5F566", hair:"#1E3100", dot:"rgba(170,255,120,.25)" },
  slate:   { accent:"#64748B", bg:"#1C1C1C", ink:"#F2F4F8", muted:"#A5B4CC", hair:"#2C3240", dot:"rgba(170,190,210,.30)" },
  luxegold:{ accent:"#D4AF37", bg:"#1C1C1C", ink:"#E6D5B8", muted:"#B8A77D", hair:"#000000", dot:"rgba(212,175,55,.25)" },
};
type Theme = (typeof THEMES)[ThemeKey];

/* ------------------ Types ------------------ */
interface Row {
  name: string;
  natKey: string;
  timeLabel: string;
  tags: string[];
}
interface Group { key: string; rows: Row[]; }

/* ------------------ Helpers ------------------ */
function stripBB(s: string): string {
  return s
    .replace(/\[URL=[^\]]+\]([^\[]+)\[\/URL\]/gi, "$1")
    .replace(/\[(?:\/)?(?:SIZE|B|COLOR|TABLE|TR|TD|URL|HR)\b[^\]]*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
function extractURLAndText(cell: string): { text: string; url?: string } {
  const m = cell.match(/\[URL=\"([^\"]+)\"\]([^\[]+)\[\/URL\]/i);
  if (m) return { text: m[2].trim(), url: m[1].trim() };
  return { text: stripBB(cell) };
}
function normalizeNat(raw: string) {
  return raw.toLowerCase().trim();
}
function extractTags(source: string): string[] {
  const raw = stripBB(source).toUpperCase();
  const tags: string[] = [];
  if (/\bNEW\b/.test(raw)) tags.push("NEW");
  if (/\bVIP\b/.test(raw)) tags.push("VIP");
  if (/\bJAV\b/.test(raw)) tags.push("JAV");
  if (/\bCAME\s*BACK\b/.test(raw) || /\bRETURN\b/.test(raw)) tags.push("CAME BACK!");
  return tags;
}
const INLINE_TAG_WORDS = ["new","vip","jav","top","special","premium","came back"];
function stripInlineTagWords(name: string): string {
  return name.replace(
    new RegExp(`\\b(?:${INLINE_TAG_WORDS.join("|")})\\b`, "gi"),
    ""
  ).replace(/\s{2,}/g, " ").trim();
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
      <style dangerouslySetInnerHTML={{
        __html: `
        .poster1{max-width:100%;margin:0 auto;background:var(--bg);color:var(--ink);border:none;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4)}
        .poster1 .content{padding:20px}
        .poster1 .title{text-align:center;margin-bottom:12px}
        .poster1 .title h1{margin:0;font-weight:900;font-size:22px}
        .poster1 .center-band{margin:12px auto;text-align:center;color:var(--muted)}
        .poster1 .center-band .line{height:1px;background:linear-gradient(to right,transparent,var(--dot),transparent)}
        .poster1 .center-band .label{font-weight:700;letter-spacing:.12em;font-size:12px;margin:.3rem 0}
        .poster1 .section{margin-bottom:18px}
        .poster1 .row{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--hair);font-size:13px}
        .poster1 .left{font-weight:700}
        .poster1 .time{margin-left:10px;color:var(--muted);font-weight:500;font-size:.85em}
        .poster1 .tags{display:inline-flex;gap:.35rem;margin-left:.5rem;flex-wrap:wrap}
        .poster1 .tag{display:inline-block;padding:.15rem .4rem;border-radius:4px;font-weight:800;font-size:.7em;color:var(--accent);border:1px solid var(--accent)}
        `
      }} />
      <div className="poster1">
        <div className="content">
          <div className="title"><h1>{title}</h1></div>
          <div className="center-band" aria-hidden="true">
            <div className="line" />
            <div className="label">{shop}</div>
            <div className="line" />
          </div>
          {groups.map((g) => (
            <section key={g.key} className="section">
              {g.rows.map((r, idx) => (
                <div key={g.key+idx} className="row">
                  <div className="left">
                    {r.name}
                    {r.tags?.length ? (
                      <span className="tags">
                        {r.tags.map((t, i) => (
                          <span key={t+i} className="tag">{t}</span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <div className="time">{r.timeLabel}</div>
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
  const [raw, setRaw] = useState(`[TABLE]... paste here ...[/TABLE]`);
  const [title, setTitle] = useState("Wednesday 17/9/2025");
  const [shop, setShop] = useState("No.5 Marrickville");

  const parsed = useMemo(() => {
    const trs = [...raw.matchAll(/\[TR\]([\s\S]*?)\[\/TR\]/gi)].map(m=>m[1]);
    const headIdx = trs.findIndex(tr => /\[SIZE=3\]/i.test(tr));
    const rows: Row[] = [];
    trs.forEach((tr,i)=>{
      if (i<=headIdx) return;
      const tds = [...tr.matchAll(/\[TD[^\]]*\]([\s\S]*?)\[\/TD\]/gi)].map(m=>m[1]||"");
      if (!tds.length) return;
      const natKey = normalizeNat(stripBB(tds[0]||""));
      const { text:rawName } = extractURLAndText(tds[1]||"");
      const name = stripInlineTagWords(rawName);
      const start = stripBB(tds[2]||"");
      const finish = stripBB(tds[3]||"");
      const timeLabel = `${start} - ${finish}`.trim();
      const tags = extractTags(tds.join(" "));
      rows.push({ natKey, name, timeLabel, tags });
    });
    return rows;
  }, [raw]);

  // smarter splitter: ~6–8 per page
  function splitRows(rows: Row[]): Row[][] {
    const result: Row[][] = [];
    const pageSize = 6;
    for (let i=0;i<rows.length;i+=pageSize) {
      let chunk = rows.slice(i, i+pageSize);
      if (chunk.length < 3 && result.length > 0) {
        result[result.length-1] = result[result.length-1].concat(chunk);
      } else {
        result.push(chunk);
      }
    }
    return result;
  }

  const pages = splitRows(parsed);

  const [pageThemes, setPageThemes] = useState<ThemeKey[]>([]);
  useEffect(()=>{
    if (pages.length>0 && pageThemes.length!==pages.length) {
      setPageThemes(pages.map(()=> "luxegold"));
    }
  },[pages]);

  async function exportAllPNGs() {
    const pageNodes = document.querySelectorAll(".poster-page");
    let idx=1;
    for (const node of pageNodes) {
      const el = node as HTMLElement;
      const width = el.scrollWidth, height = el.scrollHeight;
      const dataUrl = await toPng(el,{pixelRatio:6,cacheBust:true,width,height});
      const a=document.createElement("a");
      a.href=dataUrl;
      a.download=`${title.replace(/\s+/g,"_")}_page${idx}.png`;
      a.click();
      idx++;
    }
  }

  function shuffleThemes() {
    const keys = Object.keys(THEMES) as ThemeKey[];
    setPageThemes(pages.map(()=> keys[Math.floor(Math.random()*keys.length)]));
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Roster BBCode → Poster Pages</h1>
        <div className="flex gap-2">
          <Button onClick={shuffleThemes}><ShuffleIcon className="w-4 h-4 mr-2"/> Shuffle</Button>
          <Button onClick={exportAllPNGs}><ImageIcon className="w-4 h-4 mr-2"/> Export PNGs</Button>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Card><CardContent className="p-4 space-y-4">
          <Label>Title</Label>
          <Input value={title} onChange={e=>setTitle(e.target.value)} />
          <Label>Shop</Label>
          <Input value={shop} onChange={e=>setShop(e.target.value)} />
          <Label>BBCode</Label>
          <Textarea rows={18} value={raw} onChange={e=>setRaw(e.target.value)} />
          <Label>Page themes</Label>
          {pages.map((_,i)=>(
            <select key={i} value={pageThemes[i]||"luxegold"}
              onChange={e=>{
                const copy=[...pageThemes];
                copy[i]=e.target.value as ThemeKey;
                setPageThemes(copy);
              }}>
              {Object.keys(THEMES).map(k=>(
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          ))}
        </CardContent></Card>

        <Card><CardContent className="p-4">
          {pages.map((rows,i)=>(
            <div key={i} style={{marginBottom:"40px"}}>
              <PosterSingle
                title={title}
                shop={shop}
                groups={[{key:"",rows}]}
                theme={THEMES[pageThemes[i]||"luxegold"]}
              />
            </div>
          ))}
        </CardContent></Card>
      </div>
    </div>
  );
}
