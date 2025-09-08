import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Copy, Image as ImageIcon, LayoutGrid, CalendarClock } from "lucide-react";
import html2canvas from "html2canvas";

// ------------------ Helpers ------------------
const FLAG_MAP: Record<string, string> = {
  japanese: "🇯🇵",
  chinese: "🇨🇳",
  vietnamese: "🇻🇳",
  thai: "🇹🇭",
  turkish: "🇹🇷",
  korean: "🇰🇷",
  taiwanese: "🇹🇼",
};

function parseTimeToDate(dayISO: string, timeStr: string): Date | null {
  if (!timeStr) return null;
  let s = timeStr.trim().toLowerCase().replace(/[\u2013\u2014]/g, "-");
  s = s.replace(/\s+/g, " ");
  const base = new Date(`${dayISO}T00:00:00`);
  let hours = 0, minutes = 0;

  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  const twentyFour = s.match(/^(\d{1,2})(?::(\d{2}))$/);
  const justHourAmpm = s.match(/^(\d{1,2})\s*(am|pm)$/);

  if (ampmMatch) {
    hours = parseInt(ampmMatch[1]);
    minutes = ampmMatch[2] ? parseInt(ampmMatch[2]) : 0;
    const ap = ampmMatch[3];
    if (ap === "pm" && hours !== 12) hours += 12;
    if (ap === "am" && hours === 12) hours = 0;
  } else if (justHourAmpm) {
    hours = parseInt(justHourAmpm[1]);
    const ap = justHourAmpm[2];
    if (ap === "pm" && hours !== 12) hours += 12;
    if (ap === "am" && hours === 12) hours = 0;
  } else if (twentyFour) {
    hours = parseInt(twentyFour[1]);
    minutes = twentyFour[2] ? parseInt(twentyFour[2]) : 0;
  } else if (/^\d{1,2}$/.test(s)) {
    hours = parseInt(s);
  } else {
    return null;
  }

  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function guessFlag(segment: string): string {
  const s = segment.trim().toLowerCase();
  for (const k of Object.keys(FLAG_MAP)) {
    if (s.includes(k)) return FLAG_MAP[k];
  }
  return "";
}

function stripBB(s: string): string {
  return s
    .replace(/\[URL=[^\]]+\]([^\[]+)\[\/URL\]/gi, '$1')
    .replace(/\[(?:\/)?(?:SIZE|B|COLOR|TABLE|TR|TD|URL)\b[^\]]*\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractURLAndText(cell: string): { text: string; url?: string } {
  const m = cell.match(/\[URL="([^"]+)"\]([^\[]+)\[\/URL\]/i);
  if (m) return { text: m[2].trim(), url: m[1].trim() };
  return { text: stripBB(cell) };
}

function cleanRate(token: string): string {
  const t = stripBB(token);
  const m = t.match(/(\d+\s*\/?\s*h?r?)/i) || t.match(/(\d+)/);
  return m ? m[1].replace(/\s+/g, "").toLowerCase().replace(/h$/,'/h') : t.trim();
}

function toNotionMarkdown(rows: Row[]): string {
  const header = `|  | Name | Time | Rate |\n|---|---|---|---|`;
  const body = rows
    .map(r => `| ${r.flag || ''} | ${r.name} | ${r.timeLabel} | ${r.rate} |`)
    .join("\n");
  return header + "\n" + body + "\n";
}

// ------------------ Types ------------------
interface Row {
  flag: string;
  name: string;
  start: Date | null;
  end: Date | null;
  rate: string;
  natKey: string; // grouping key (e.g., japanese)
  timeLabel: string; // original label
}

// ------------------ Component ------------------
export default function RosterBBApp() {
  const [raw, setRaw] = useState(`[TABLE]
[TR]
[TD][B][SIZE=4]Saturday[/SIZE][/B][/TD]
[TD][SIZE=4][COLOR=#000000]6/9/2025[/COLOR][/SIZE][/TD]
[/TR]
[/TABLE]

[TABLE="width: 500"]
[TR]
[TD][SIZE=3]Nationality[/SIZE][/TD]
[TD][SIZE=3]Name[/SIZE][/TD]
[TD][SIZE=3]Time[/SIZE][/TD]
[TD][SIZE=3]Rate[/SIZE][/TD]
[/TR]
[TR]
[TD]Vietnamese[/TD]
[TD][URL="https://no5marrickville.com/profile/ami/?utm_source=a99"]Ami[/URL][/TD]
[TD]10 am – 10 pm[/TD]
[TD]300/h[/TD]
[/TR]
[TR]
[TD]Japanese[/TD]
[TD][URL="https://no5marrickville.com/profile/almond/?utm_source=a99"]Almond[/URL][/TD]
[TD]10 am – 10 pm[/TD]
[TD]310/h[/TD]
[/TR]
[TR]
[TD]Vietnamese[/TD]
[TD][URL="https://no5marrickville.com/profile/saka/?utm_source=a99"]Saka[/URL][/TD]
[TD]10 am – 6 pm[/TD]
[TD]300/h[/TD]
[/TR]
[TR]
[TD]Japanese[/TD]
[TD][URL="https://no5marrickville.com/profile/hinata-1/?utm_source=a99"]Hinata[/URL][/TD]
[TD]10 am – 10 pm[/TD]
[TD]300/h[/TD]
[/TR]
[TR]
[TD]Japanese[/TD]
[TD][URL="https://no5marrickville.com/profile/rina-1/?utm_source=a99"]Rina[/URL][/TD]
[TD]10 am – 5 pm[/TD]
[TD]300/h[/TD]
[/TR]
[TR]
[TD]Korean[/TD]
[TD][URL="https://no5marrickville.com/profile/emma-1/?utm_source=a99"]Emma[/URL][/TD]
[TD]10 am – 6 pm[/TD]
[TD]300/h[/TD]
[/TR]
[/TABLE]`);

  const [groupByNationality, setGroupByNationality] = useState(true);
  const [compact, setCompact] = useState(false);
  const [title, setTitle] = useState("Saturday 6/9/2025");
  const exportRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => {
    // Title
    let pageTitle = title;
    let dayISO = "2025-09-06";
    const dateMatch = raw.match(/\](\d{1,2}\/\d{1,2}\/\d{4})\[/);
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split('/').map(Number);
      const iso = new Date(y, m - 1, d);
      dayISO = iso.toISOString().slice(0,10);
      const weekdayMatch = raw.match(/\[SIZE=4\](Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\[\/SIZE\]/i);
      pageTitle = `${weekdayMatch ? weekdayMatch[1] + ' ' : ''}${dateMatch[1]}`;
    }

    // Body table content
    const tables = raw.match(/\[TABLE[^\]]*\][\s\S]*?\[\/TABLE\]/gi) || [];
    const bodyTable = tables.length > 1 ? tables[1] : tables[0] || '';
    const contentMatch = bodyTable.match(/\[TABLE[^\]]*\]([\s\S]*?)\[\/TABLE\]/i);
    const content = contentMatch ? contentMatch[1] : '';

    const trs = content.match(/\[TR\]([\s\S]*?)\[\/TR\]/gi) || [];

    const rows: Row[] = [];
    for (const tr of trs) {
      if (/\[SIZE=3\]/i.test(tr)) continue; // skip header row
      const tds = tr.match(/\[TD[^\]]*\]([\s\S]*?)\[\/TD\]/gi) || [];
      if (tds.length < 4) continue;

      const natText = stripBB(tds[0]);
      const flag = guessFlag(natText);
      const { text: nameText } = extractURLAndText(tds[1]);
      const timeLabel = stripBB(tds[2]).replace(/\s*–\s*/g, ' - ').replace(/\s+/g, ' ').trim();
      const rate = cleanRate(tds[3]);

      const [startRaw, endRaw] = timeLabel.split(/\s*-\s*/);
      const start = parseTimeToDate(dayISO, startRaw || '');
      let end = parseTimeToDate(dayISO, endRaw || '');
      if (start && end && end <= start) end = new Date(end.getTime() + 24*60*60*1000);

      rows.push({
        flag,
        name: nameText,
        start,
        end,
        rate,
        natKey: natText.toLowerCase(),
        timeLabel,
      });
    }

    // Group in first-appearance order, sort by start time
    const grouped: Record<string, Row[]> = {};
    const order: string[] = [];
    for (const r of rows) {
      const k = r.natKey || 'others';
      if (!grouped[k]) { grouped[k] = []; order.push(k); }
      grouped[k].push(r);
    }
    for (const k of Object.keys(grouped)) grouped[k].sort((a,b)=> (a.start?.getTime()||0)-(b.start?.getTime()||0));

    const orderedGroups = order.map(k => ({ key: k, flag: FLAG_MAP[k] || '', rows: grouped[k] })).filter(g=>g.rows.length);
    const flat = orderedGroups.flatMap(g=>g.rows);

    return { title: pageTitle, groups: orderedGroups, flat };
  }, [raw, title, groupByNationality]);

  async function exportPNG() {
    if (!exportRef.current) return;
    const node = exportRef.current;
    const canvas = await html2canvas(node, { backgroundColor: "#0a0a0a", scale: 2, useCORS: true });
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${(parsed.title || "roster").replace(/\s+/g, "_")}.png`;
    a.click();
  }

  function copyMarkdown() {
    const md = toNotionMarkdown(parsed.flat);
    navigator.clipboard.writeText(md);
  }

  function copyCSV() {
    const header = ["Flag", "Name", "Start", "Finish", "Rate"]; 
    const lines = parsed.flat.map(r => [r.flag, r.name, r.start?.toISOString() || "", r.end?.toISOString() || "", r.rate].join(","));
    const csv = header.join(",") + "\n" + lines.join("\n");
    navigator.clipboard.writeText(csv);
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Roster BBCode → Table/PNG</h1>
          <p className="text-sm text-neutral-600">Paste forum BBCode tables. Auto-parse → pretty table → export PNG / Notion.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={copyMarkdown} className="rounded-2xl" title="Copy Markdown for Notion"><Copy className="w-4 h-4 mr-2"/>MD</Button>
          <Button onClick={copyCSV} className="rounded-2xl" title="Copy CSV for Notion DB"><LayoutGrid className="w-4 h-4 mr-2"/>CSV</Button>
          <Button onClick={exportPNG} className="rounded-2xl" title="Export PNG (WeChat)"><ImageIcon className="w-4 h-4 mr-2"/>PNG</Button>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <Card className="shadow-sm rounded-2xl">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Saturday 6/9/2025"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="raw">Raw BBCode input</Label>
              <Textarea id="raw" rows={18} value={raw} onChange={(e)=>setRaw(e.target.value)} placeholder="Paste your [TABLE]... BBCode here"/>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch id="group" checked={groupByNationality} onCheckedChange={setGroupByNationality}/><Label htmlFor="group">Group by nationality</Label></div>
              <div className="flex items-center gap-2"><Switch id="compact" checked={compact} onCheckedChange={setCompact}/><Label htmlFor="compact">Compact rows</Label></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-2xl">
          <CardContent className="p-0">
            <div ref={exportRef} className="w-full bg-neutral-900 text-neutral-50 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold tracking-tight">{title || parsed.title}</h2>
              </div>

              {groupByNationality ? (
                <div className="space-y-6">
                  {parsed.groups.map(g => (
                    <div key={g.key} className="space-y-2">
                      <div className="text-sm uppercase tracking-wider text-neutral-300">{g.flag} {g.key}</div>
                      <div className="overflow-hidden rounded-xl ring-1 ring-neutral-800">
                        <table className="w-full text-sm">
                          <thead className="bg-neutral-800/60">
                            <tr>
                              <th className="text-left px-3 py-2">Name</th>
                              <th className="text-left px-3 py-2">Time</th>
                              <th className="text-left px-3 py-2">Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.rows.map((r, idx) => (
                              <tr key={g.key+idx} className={idx % 2 ? "bg-neutral-900" : "bg-neutral-900/70"}>
                                <td className="px-3 py-2 font-medium">{r.name}</td>
                                <td className="px-3 py-2">{r.timeLabel}</td>
                                <td className="px-3 py-2">{r.rate}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl ring-1 ring-neutral-800">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-800/60">
                      <tr>
                        <th className="text-left px-3 py-2">Name</th>
                        <th className="text-left px-3 py-2">Nationality</th>
                        <th className="text-left px-3 py-2">Time</th>
                        <th className="text-left px-3 py-2">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.flat.map((r, idx) => (
                        <tr key={r.name+idx} className={idx % 2 ? "bg-neutral-900" : "bg-neutral-900/70"}>
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2 capitalize">{r.natKey || ""}</td>
                          <td className="px-3 py-2">{r.timeLabel}</td>
                          <td className="px-3 py-2">{r.rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center text-xs text-neutral-500 mt-2">BBCode → Notion/WeChat helper. Dark, crisp export.</footer>
    </div>
  );
}
