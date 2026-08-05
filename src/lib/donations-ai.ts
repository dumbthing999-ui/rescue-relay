// Rescue Relay — Donation photo classifier
// AI at the edge: turn 1-5 donation photos into a structured listing.
// Provider: NVIDIA NIM vision (verified working). 3-layer fallback ladder:
//   vision + zod  →  heuristic (keyword/filename)  →  empty editable draft.
// NEVER throws to the route; every path returns a usable ClassifyResult.

import { z } from "zod";
import type { ClassifyResult, Perishability } from "@/types";

const NVIDIA_MODELS = [
  "meta/llama-3.2-90b-vision-instruct",
  "meta/llama-3.2-11b-vision-instruct",
  "google/gemma-3-12b-it",
];

// ---------------------------------------------------------------- zod schema

const itemSchema = z.object({
  name: z.string().default("Food items"),
  quantity: z.string().default("1"),
  weight_estimate_kg: z.number().nullable().default(null),
  weight_estimate_lbs: z.number().nullable().default(null),
  perishability: z
    .enum(["dry_goods", "produce", "refrigerated", "frozen", "prepared", "unknown"])
    .default("unknown"),
  best_by: z.string().nullable().default(null),
  expiry_visible: z.boolean().default(false),
  cold_chain: z.boolean().nullable().default(null),
  quantity_confidence: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
  note: z.string().default(""),
});

const classifySchema = z.object({
  items: z.array(itemSchema).default([]),
  summary: z.string().default(""),
  urgency: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).default(1),
  explanation: z.string().default(""),
  unclear: z.boolean().default(false),
});

// ---------------------------------------------------------------- prompt

const SYSTEM_PROMPT = `You are "Rescue Relay", a food-rescue donation classifier. Given photos of a food donation (produce boxes, canned goods, packaged items, bakery, dairy), extract a structured listing.

Rules:
- Only state what is VISIBLE or confidently inferable. Do NOT hallucinate brands, weights, or expiry dates. If unknown, output null or "unknown" — never invent a number.
- Food-safety over generosity: a slightly conservative estimate beats an overstated one.
- Urgency is about how fast the food must be rescued/used, NOT value: 0 = non-perishable, 1 = short shelf life (days), 2 = perishable / needs cold chain or use within hours, 3 = time-critical (expiring today or visibly spoiling).
- If the photo is unclear, empty, or has no recognizable food: items = [] and a short explanation. DO NOT invent items.
- Return ONLY a raw JSON object. No markdown, no code fences, no commentary.`;

function buildUserPrompt(filenames: string[]): string {
  return `Analyze this donation photo and return JSON exactly matching this schema:
{
  "items": [{
    "name": "string",
    "quantity": "string",
    "weight_estimate_kg": number|null,
    "weight_estimate_lbs": number|null,
    "perishability": "dry_goods|produce|refrigerated|frozen|prepared|unknown",
    "best_by": "YYYY-MM-DD|null",
    "expiry_visible": true|false,
    "cold_chain": true|false|null,
    "quantity_confidence": 0|1|2,
    "note": "string"
  }],
  "summary": "string",
  "urgency": 0|1|2|3,
  "explanation": "string",
  "unclear": true|false
}

File name hints: ${filenames.join(", ") || "none"}`;
}

// ---------------------------------------------------------------- NVIDIA call

async function callNvidia(
  base64: string,
  userPrompt: string
): Promise<string> {
  const key = process.env.NVIDIA_API_KEY;
  const base = process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
  if (!key) throw new Error("NVIDIA_API_KEY not set");

  let lastErr: unknown;
  for (const model of NVIDIA_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 1024,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                {
                  type: "image_url",
                  image_url: { url: base64 },
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`NVIDIA ${model} ${res.status}`);
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty model response");
      return String(text);
    } catch (e) {
      lastErr = e;
      // try next model
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------- heuristic fallback

const KEYWORD_MAP: Array<{
  match: RegExp;
  name: string;
  perishability: Perishability;
  cold_chain: boolean | null;
  urgency: 0 | 1 | 2 | 3;
}> = [
  { match: /dairy|milk|yogurt|cheese|cream/i, name: "Dairy products", perishability: "refrigerated", cold_chain: true, urgency: 2 },
  { match: /apple|orange|banana|produce|vegetable|fruit|salad|greens/i, name: "Fresh produce", perishability: "produce", cold_chain: null, urgency: 1 },
  { match: /bread|bakery|bagel|pastry|muffin|cake|roll/i, name: "Bakery items", perishability: "prepared", cold_chain: null, urgency: 1 },
  { match: /meat|chicken|beef|deli|sandwich|prepared/i, name: "Prepared / deli items", perishability: "prepared", cold_chain: true, urgency: 2 },
  { match: /frozen|ice|pizza/i, name: "Frozen items", perishability: "frozen", cold_chain: true, urgency: 1 },
  { match: /can|canned|soup|beans|pasta|rice|dry/i, name: "Dry / canned goods", perishability: "dry_goods", cold_chain: false, urgency: 0 },
];

export function heuristicParse(filenames: string[]): ClassifyResult {
  const items = filenames.map((f) => {
    const hit = KEYWORD_MAP.find((k) => k.match.test(f));
    if (!hit) {
      return {
        name: "Food items (photo)",
        quantity: "1",
        weight_estimate_kg: null,
        weight_estimate_lbs: null,
        perishability: "unknown" as const,
        best_by: null,
        expiry_visible: false,
        cold_chain: null,
        quantity_confidence: 0 as const,
        note: "Auto-filled — confirm before posting.",
      };
    }
    return {
      name: hit.name,
      quantity: "1 (photo count estimate)",
      weight_estimate_kg: null,
      weight_estimate_lbs: null,
      perishability: hit.perishability,
      best_by: null,
      expiry_visible: false,
      cold_chain: hit.cold_chain,
      quantity_confidence: 0 as const,
      note: "Auto-filled — confirm before posting.",
    };
  });

  const urgency = items.reduce<0 | 1 | 2 | 3>(
    (max, it) =>
      (it.perishability === "refrigerated" || it.perishability === "frozen" ? 2 : 1) > max
        ? it.perishability === "refrigerated" || it.perishability === "frozen"
          ? 2
          : 1
        : max,
    0
  );

  return {
    status: "heuristic",
    items,
    summary: "Auto-filled listing based on file names.",
    urgency,
    explanation: "Vision classification was unavailable; these defaults came from the file name.",
    unclear: items.length === 0,
  };
}

// ---------------------------------------------------------------- parse

function stripFences(text: string): string {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function parseResult(text: string): ClassifyResult {
  const cleaned = stripFences(text);
  const parsed = JSON.parse(cleaned);
  const validated = classifySchema.parse(parsed);
  return {
    status: "ai",
    ...validated,
  };
}

// ---------------------------------------------------------------- main entry

export async function classifyPhotos(
  photos: { base64: string; filename: string }[],
  filenames: string[]
): Promise<ClassifyResult> {
  try {
    if (photos.length === 0) {
      // No photos — go straight to heuristics.
      return heuristicParse(filenames);
    }
    const userPrompt = buildUserPrompt(filenames);
    const raw = await callNvidia(photos[0].base64, userPrompt);

    try {
      return parseResult(raw);
    } catch {
      // Retry once with a stricter instruction.
      const retryPrompt =
        userPrompt +
        "\n\nYour previous response was not valid JSON. Return ONLY valid JSON, no markdown.";
      const retryRaw = await callNvidia(photos[0].base64, retryPrompt);
      return parseResult(retryRaw);
    }
  } catch {
    return heuristicParse(filenames);
  }
}
