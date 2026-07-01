const ZWS = /[\u200B-\u200D\uFEFF]/g;

function normalize(s: string): string {
  return (s ?? "")
    .normalize("NFC")
    .replace(ZWS, "")
    .toLowerCase()
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let curr = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(prev[j] + 1, curr + 1, prev[j - 1] + cost);
      prev[j - 1] = curr;
      curr = next;
    }
    prev[b.length] = curr;
  }
  return prev[b.length];
}

function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

export function containsBadWord(
  text: string,
  badWords: string[],
  whitelist: string[] = [],
  matchThreshold: number = 100, // percent; 100 = exact substring only
): { matched: boolean; word?: string; score?: number } {
  if (!text || !badWords || badWords.length === 0) return { matched: false };
  let t = normalize(text);
  for (const w of whitelist) {
    const nw = normalize(w);
    if (!nw) continue;
    t = t.split(nw).join(" ");
  }
  const threshold = Math.max(0, Math.min(100, matchThreshold)) / 100;

  // 1) exact substring (cheap)
  for (const w of badWords) {
    const nw = normalize(w);
    if (!nw) continue;
    if (t.includes(nw)) return { matched: true, word: nw, score: 1 };
  }
  if (threshold >= 0.999) return { matched: false };

  // 2) fuzzy: compare each token (and sliding word pairs) vs each bad word
  const tokens = t.split(/[\s,.!?;:।\-—()"'`]+/).filter(Boolean);
  const candidates: string[] = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) {
    candidates.push(tokens[i] + " " + tokens[i + 1]);
  }
  for (const w of badWords) {
    const nw = normalize(w);
    if (!nw || nw.length < 3) continue;
    for (const c of candidates) {
      if (Math.abs(c.length - nw.length) > Math.max(2, nw.length)) continue;
      const s = similarity(c, nw);
      if (s >= threshold) return { matched: true, word: nw, score: s };
    }
  }
  return { matched: false };
}

export function computeBlockExpiry(duration: string): string | null {
  const now = Date.now();
  if (duration === "24h") return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  if (duration === "7d") return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  return null; // permanent
}
