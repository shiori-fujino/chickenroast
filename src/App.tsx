import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Switch } from "./components/ui/switch";
import { Label } from "./components/ui/label";
import { Image as ImageIcon, Sun, Moon } from "lucide-react";
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
  indonesian: "🇮🇩",
  brazilian: "🇧🇷",
  "new zealand": "🇳🇿",
};

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
  // ✅ preserve $ sign if present
  const m = t.match(/(\$?\s*\d+\s*\/?\s*h?r?)/i);
  return m
    ? m[1]
        .replace(/\s+/g, "")
        .toLowerCase()
        .replace(/h$/, "/h")
        .replace(/\/\//g, "/")
    : "";
}

function normalizeNat(rawNat: string): string {
  return rawNat
    .toLowerCase()
    .replace(/\bnew\b(?!\s*zealand)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function bestFlag(natText: string): { flag: string; key: string } {
  const key = normalizeNat(natText);
  const fallbackKey = Object.keys(FLAG_MAP).find((k) => key.includes(k));
  return {
    key,
    flag: FLAG_MAP[key] || (fallbackKey ? FLAG_MAP[fallbackKey] : ""),
  };
}

// ------------------ Types ------------------
interface Row {
  flag: string;
  name: string;
  rate: string;
  natKey: string;
  timeLabel: string;
}

// ------------------ Component ------------------
export default function RosterBBApp() {
  const [raw, setRaw] = useState(`
[TABLE]
[TR]
[TD][SIZE=3]Nationality[/SIZE][/TD]
[TD][SIZE=3]Name[/SIZE][/TD]
[TD][SIZE=3]Time[/SIZE][/TD]
[TD][SIZE=3]Rate[/SIZE][/TD]
[/TR]
[TR]
[TD]Japanese[/TD]
[TD][URL="https://no5marrickville.com/profile/hinata-1/?utm_source=a99"]Hinata[/URL][/TD]
[TD]10 am – 10 pm[/TD]
[TD]$320[/TD]
[/TR]
[/TABLE]`);

  const [groupByNationality, setGroupByNationality] = useState(true);
  const [compact, setCompact] = useState(false);
  const [title, setTitle] = useState("Wednesday 10/9/2025");
  const [darkMode, setDarkMode] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => {
    const trs = [...raw.matchAll(/\[TR\]([\s\S]*?)\[\/TR\]/gi)].map(
      (m) => m[1] || ""
    );

    const rows: Row[] = [];
    for (const tr of trs) {
      if (/\[SIZE=3\]/i.test(tr)) continue;
      const tds = [...tr.matchAll(/\[TD[^\]]*\]([\s\S]*?)\[\/TD\]/gi)].map(
        (m) => m[1] || ""
      );
      if (tds.length < 4) continue;

      const natText = stripBB(tds[0]);
      const { key: natKey, flag } = bestFlag(natText);
      const { text: nameText } = extractURLAndText(tds[1]);
      const timeLabel = stripBB(tds[2])
        .replace(/\s*–\s*/g, " - ")
        .replace(/\s+/g, " ")
        .trim();
      const rate = cleanRate(tds[3]);

      rows.push({ flag, name: nameText, rate, natKey, timeLabel });
    }

    const grouped: Record<string, Row[]> = {};
    const order: string[] = [];
    for (const r of rows) {
      const k = r.natKey || "others";
      if (!grouped[k]) {
        grouped[k] = [];
        order.push(k);
      }
      grouped[k].push(r);
    }

    const orderedGroups = order
      .map((k) => ({ key: k, flag: FLAG_MAP[k] || "", rows: grouped[k] }))
      .filter((g) => g.rows.length);

    return { title, groups: orderedGroups, flat: rows };
  }, [raw, title]);

  async function exportPNG() {
    if (!exportRef.current) return;
    const node = exportRef.current;

    await new Promise((r) => setTimeout(r, 50));
    const canvas = await html2canvas(node, {
      backgroundColor: darkMode ? "#0a0a0a" : "#ffffff",
      scale: 2,
      useCORS: true,
    });
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${(parsed.title || "roster").replace(/\s+/g, "_")}.png`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Roster BBCode → PNG</h1>
          <p className="text-sm text-neutral-600">
            Paste BBCode tables → pretty roster → export PNG.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPNG} className="rounded-2xl" title="Export PNG">
            <ImageIcon className="w-4 h-4 mr-2" />
            PNG
          </Button>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Left side: input */}
        <Card className="shadow-sm rounded-2xl">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}

                placeholder="Wednesday 10/9/2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="raw">BBCode input</Label>
              <Textarea
                id="raw"
                rows={16}
                value={raw}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRaw(e.target.value)}
                placeholder="Paste your [TABLE]... BBCode here"
              />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="group"
                  checked={groupByNationality}
                  onCheckedChange={setGroupByNationality}
                />
                <Label htmlFor="group">Group by nationality</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="compact"
                  checked={compact}
                  onCheckedChange={setCompact}
                />
                <Label htmlFor="compact">Compact rows</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="dark"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
                <Label htmlFor="dark">
                  {darkMode ? (
                    <Moon className="inline w-4 h-4" />
                  ) : (
                    <Sun className="inline w-4 h-4" />
                  )}{" "}
                  {darkMode ? "Dark" : "Light"}
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right side: preview/export */}
        <Card className="shadow-sm rounded-2xl">
          <CardContent className="p-0">
            <div
              ref={exportRef}
              className={`w-full p-6 rounded-2xl ${
                darkMode
                  ? "bg-neutral-900 text-neutral-50"
                  : "bg-white text-neutral-900"
              }`}
            >
              <div className="flex items-center justify-center mb-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  {parsed.title}
                </h2>
              </div>

              {groupByNationality ? (
                <div className="space-y-6">
                  {parsed.groups.map((g) => (
                    <div
                      key={g.key}
                      className={`rounded-xl shadow-sm p-4 ${
                        darkMode ? "bg-neutral-800" : "bg-neutral-50"
                      }`}
                    >
                      <div
                        className={`font-semibold text-base border-b mb-3 pb-1 ${
                          darkMode
                            ? "text-yellow-400 border-neutral-700"
                            : "text-pink-600 border-neutral-200"
                        }`}
                      >
                        {g.flag} {g.key.replace(/\b\w/g, (c) => c.toUpperCase())}
                      </div>
                      <div
                        className={`divide-y ${
                          darkMode ? "divide-neutral-700" : "divide-neutral-200"
                        }`}
                      >
                        {g.rows.map((r, idx) => (
                          <div
                            key={g.key + idx}
                            className={`grid grid-cols-3 items-center text-sm ${
                              compact ? "py-1.5" : "py-3"
                            }`}
                          >
                            <div className="font-medium">{r.name}</div>
                            <div className="text-center">{r.timeLabel}</div>
                            <div
                              className={`text-right font-semibold ${
                                darkMode ? "text-yellow-400" : "text-pink-600"
                              }`}
                            >
                              {r.rate}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`rounded-xl shadow-sm overflow-hidden ${
                    darkMode ? "bg-neutral-800" : "bg-neutral-50"
                  }`}
                >
                  <div
                    className={`grid grid-cols-4 text-sm font-semibold border-b ${
                      darkMode
                        ? "bg-neutral-700 border-neutral-600"
                        : "bg-neutral-100 border-neutral-200"
                    }`}
                  >
                    <div className="px-3 py-2">Name</div>
                    <div className="px-3 py-2">Nationality</div>
                    <div className="px-3 py-2">Time</div>
                    <div className="px-3 py-2">Rate</div>
                  </div>
                  <div
                    className={`divide-y ${
                      darkMode ? "divide-neutral-700" : "divide-neutral-200"
                    }`}
                  >
                    {parsed.flat.map((r, idx) => (
                      <div
                        key={r.name + idx}
                        className={`grid grid-cols-4 items-center text-sm ${
                          compact ? "py-1.5" : "py-3"
                        }`}
                      >
                        <div className="px-3 font-medium">{r.name}</div>
                        <div className="px-3 capitalize">{r.natKey}</div>
                        <div className="px-3 text-center">{r.timeLabel}</div>
                        <div
                          className={`px-3 text-right font-semibold ${
                            darkMode ? "text-yellow-400" : "text-pink-600"
                          }`}
                        >
                          {r.rate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center text-xs text-neutral-500 mt-2">
        BBCode → WeChat helper. Pure CSS Grid. Toggle Dark/Light. Export PNG.
      </footer>
    </div>
  );
}
