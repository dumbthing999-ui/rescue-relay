import { z } from "zod";

const nimConfig = {
  baseUrl: "https://integrate.api.nvidia.com/v1",
  model: "meta/llama-3.2-90b-vision-instruct",
};

export const donationSchema = z.object({
  donation_type: z.string(),
  urgency_level: z.string(),
  recipient_need_category: z.string(),
  confidence_score: z.number(),
});

const heuristicCache = new Map<string, z.infer<typeof donationSchema>>();

function heuristic(text: string) {
  const m = text.toLowerCase();
  const map: Record<string, Partialz.infer<typeof donationSchema>>> = {
    food: { donation_type: "food", urgency_level: "high", recipient_need_category: "nutrition" },
    shelter: { donation_type: "shelter", urgency_level: "medium", recipient_need_category: "housing" },
    medical: { donation_type: "medical", urgency_level: "high", recipient_need_category: "health" },
  };
  for (const [k, v] of Object.entries(map)) {
    if (m.includes(k)) return donationSchema.parse({ confidence_score: 0.7, ...v });
  }
  return null;
}

export async function classifyDonation(text: string): Promisez.infer<typeof donationSchema>> {
  try {
    const res = await fetch(`${nimConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer $NIM_API_KEY" },
      body: JSON.stringify({ model: nimConfig.model, messages: [{ role: "user", content: text }] }),
    });
    const data = await res.json();
    return donationSchema.parse(JSON.parse(data.choices?.[0]?.message?.content || "{}"));
  } catch {
    const cached = heuristicCache.get(text) || heuristic(text);
    if (cached) return cached;
    return donationSchema.parse({ donation_type: "unknown", urgency_level: "low", recipient_need_category: "general", confidence_score: 0.1 });
  }
}
