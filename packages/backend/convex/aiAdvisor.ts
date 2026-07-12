"use node";

import { v } from 'convex/values';
import { action } from './_generated/server';

declare const process: { env: Record<string, string | undefined> };
declare const Buffer: { from(input: string, encoding: 'base64'): Uint8Array };

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_AUDIO_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b';
const GROQ_TRANSCRIBE_MODEL = process.env.GROQ_TRANSCRIBE_MODEL ?? 'whisper-large-v3-turbo';
const RAISING_CATEGORIES = ['cattle', 'sheep', 'poultry', 'rabbits'];

const CATEGORY_HINTS: Record<string, string[]> = {
  cattle: ['mol', 'qoramol', 'buzoq', 'sigir', 'hoʻkiz', 'hokiz', 'tana', 'novvos'],
  sheep: ['qoʻy', 'qoy', 'echki', 'uloq', 'barra', 'sovliq'],
  poultry: ['tovuq', 'joja', 'joʻja', 'kurka', 'parranda'],
  horses: ['ot', 'toy', 'aygir', 'biya'],
  pets: ['it', 'mushuk', 'kuchuk', 'uy hayvoni'],
  rabbits: ['quyon'],
  fish: ['baliq'],
  supplies: ['yem', 'xashak', 'ozuqa', 'katak', 'qafas'],
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’ʻ`']/g, "'")
    .replace(/ў/g, "o'")
    .replace(/ғ/g, "g'")
    .replace(/қ/g, 'q')
    .replace(/ҳ/g, 'h');
}

function parseBudget(text: string) {
  const t = normalize(text).replace(/,/g, '.');
  const million = t.match(/(\d+(?:\.\d+)?)\s*(m|mln|million|млн)/);
  if (million) return Math.round(Number(million[1]) * 1_000_000);
  const thousand = t.match(/(\d+(?:\.\d+)?)\s*(k|ming|тыс)/);
  if (thousand) return Math.round(Number(thousand[1]) * 1_000);
  const som = t.match(/(\d[\d\s]{4,})/);
  if (som) return Number(som[1].replace(/\s/g, ''));
  return undefined;
}

function heuristic(text: string) {
  const t = normalize(text);
  const categories = Object.entries(CATEGORY_HINTS)
    .filter(([, hints]) => hints.some((hint) => t.includes(normalize(hint))))
    .map(([slug]) => slug);
  const budgetMax = parseBudget(t);
  const raiseGoal = /(boq|yetishtir|kopaytir|ko'paytir|sotib|foyda|invest)/.test(t);
  const timeline = t.match(/(\d+)\s*[-–]?\s*(\d+)?\s*(yil|oy)/);
  const timelineMonths = timeline
    ? (Number(timeline[2] ?? timeline[1]) * (timeline[3] === 'yil' ? 12 : 1))
    : undefined;

  const inferred = categories.length
    ? categories
    : raiseGoal
      ? ['cattle', 'sheep']
      : [];
  const primary = inferred[0];
  const risk =
    !budgetMax ? "Ma'lumot kam" : raiseGoal && primary === 'cattle' ? "O'rta" : raiseGoal ? "Past-o'rta" : "Past";
  const timelineLabel = timelineMonths
    ? `${timelineMonths} oy atrofida`
    : raiseGoal
      ? "6-24 oy"
      : "Tez xarid";

  return {
    summary:
      budgetMax && inferred.length
        ? `${budgetMax.toLocaleString('ru-RU')} so'm atrofida ${raiseGoal ? 'boqib sotishga' : 'xaridga'} mos e'lonlarni saraladim.`
        : "Vaziyatingizga mos e'lonlarni saralash uchun budjet, hayvon turi yoki maqsadni yozing.",
    advice:
      inferred.includes('cattle') || inferred.includes('sheep')
        ? "Boqib keyin sotish uchun yosh buzoq yoki qo'y variantlari ko'proq mos keladi. Narxdan tashqari vazni, sog'ligi va sotuvchi ishonchini tekshiring."
        : "Eng mos e'lonlarni tanlashda narx, joylashuv, rasm borligi va sotuvchi ishonchini ustun qo'ydim.",
    budgetMax,
    categories: inferred.slice(0, 3),
    goal: raiseGoal ? 'raise_and_resell' : 'buy',
    timelineMonths,
    keywords: t.split(/\s+/).filter((w) => w.length > 3).slice(0, 8),
    confidence: budgetMax || inferred.length ? 0.72 : 0.35,
    chips: [
      budgetMax ? 'Budjetga mos' : null,
      raiseGoal ? 'Boqib sotish' : null,
      inferred.length ? 'Turiga mos' : null,
    ].filter((x): x is string => !!x),
    followUps: [
      "Joyingiz va viloyatingiz qayer?",
      "Boqish tajribangiz bormi?",
      "Yem-xashak uchun alohida budjet bormi?",
    ],
    estimate: {
      title: raiseGoal ? "Mini reja" : "Moslik signallari",
      items: [
        { label: 'Risk', value: risk },
        { label: 'Muddat', value: timelineLabel },
        {
          label: 'Xarajat',
          value: budgetMax ? `${budgetMax.toLocaleString('ru-RU')} so'mgacha` : "Budjet kerak",
        },
      ],
    },
  };
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Partial<ReturnType<typeof heuristic>>;
  } catch {
    return null;
  }
}

function cleanCategories(parsed: unknown, fallback: ReturnType<typeof heuristic>) {
  const parsedCategories = Array.isArray(parsed)
    ? parsed.filter((x): x is string => typeof x === 'string')
    : [];
  const allowed = new Set(Object.keys(CATEGORY_HINTS));
  const merged = [...fallback.categories, ...parsedCategories]
    .filter((x) => allowed.has(x))
    .filter((x, i, arr) => arr.indexOf(x) === i);

  if (fallback.goal === 'raise_and_resell') {
    const livestock = merged.filter((x) => RAISING_CATEGORIES.includes(x));
    return (livestock.length ? livestock : ['cattle', 'sheep']).slice(0, 3);
  }

  return (merged.length ? merged : fallback.categories).slice(0, 3);
}

export const ask = action({
  args: { text: v.string() },
  handler: async (_ctx, { text }) => {
    const fallback = heuristic(text);
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return { ...fallback, provider: 'local-fallback' };

    try {
      const res = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.2,
          max_tokens: 500,
          messages: [
            {
              role: 'system',
              content:
                'You are Halolmi AI search for an Uzbek animal marketplace. Parse messy Uzbek/Russian/Latin slang into marketplace filters. Return only JSON with keys: summary, advice, budgetMax, categories, goal, timelineMonths, keywords, confidence, chips, followUps, estimate. Categories must be from cattle, sheep, poultry, horses, pets, rabbits, fish, supplies. followUps must be 2-3 short Uzbek Latin questions or helpful answer chips. estimate must be {title, items:[{label,value}]}. Advice must be short Uzbek Latin, practical, and must not promise profit.',
            },
            { role: 'user', content: text },
          ],
        }),
      });
      if (!res.ok) return { ...fallback, provider: 'local-fallback' };
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const parsed = extractJson(json.choices?.[0]?.message?.content ?? '');
      if (!parsed) return { ...fallback, provider: 'local-fallback' };
      return {
        ...fallback,
        ...parsed,
        budgetMax: typeof parsed.budgetMax === 'number' ? parsed.budgetMax : fallback.budgetMax,
        goal: parsed.goal === 'raise_and_resell' || fallback.goal === 'raise_and_resell'
          ? 'raise_and_resell'
          : (parsed.goal ?? fallback.goal),
        categories: cleanCategories(parsed.categories, fallback),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8) : fallback.keywords,
        chips: Array.isArray(parsed.chips) ? parsed.chips.slice(0, 4) : fallback.chips,
        followUps: Array.isArray(parsed.followUps)
          ? parsed.followUps.filter((x): x is string => typeof x === 'string').slice(0, 3)
          : fallback.followUps,
        estimate:
          parsed.estimate &&
          typeof parsed.estimate === 'object' &&
          Array.isArray((parsed.estimate as { items?: unknown }).items)
            ? parsed.estimate
            : fallback.estimate,
        provider: 'groq',
      };
    } catch {
      return { ...fallback, provider: 'local-fallback' };
    }
  },
});

export const transcribe = action({
  args: {
    audioBase64: v.string(),
    mimeType: v.optional(v.string()),
  },
  handler: async (_ctx, { audioBase64, mimeType }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not configured');

    const bytes = new Uint8Array(Buffer.from(audioBase64, 'base64'));
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const form = new FormData();
    form.append('model', GROQ_TRANSCRIBE_MODEL);
    form.append('language', 'uz');
    form.append('file', new Blob([arrayBuffer], { type: mimeType ?? 'audio/m4a' }), 'voice.m4a');

    const res = await fetch(GROQ_AUDIO_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) throw new Error('Voice transcription failed');
    const json = (await res.json()) as { text?: string };
    return { text: json.text ?? '' };
  },
});
