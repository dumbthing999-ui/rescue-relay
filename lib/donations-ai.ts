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

type Donation = z.infer<typeof donationSchema>;
type PartialDonation = Partial<Donation>;

const heuristicCache = new Map<string, Donation>();

function heuristic(text: string): Donation | null {
  const m = text.toLowerCase();
  const entries: Record<string, PartialDonation> = {
    food: { donation_type: "food", urgency_level: "high", recipient_need_category: "nutrition" },
    shelter: { donation_type: "shelter", urgency_level: "medium", recipient_need_category: "housing" },
    medical: { donation_type: "medical", urgency_level: "high", recipient_need_category: "health" },
  };
  for (const [k, v] of Object.entries(entries)) {
    if (m.includes(k)) return donationSchema.parse({ confidence_score: 0.7, ...v }) as Donation;
  }
  return null;
}

export async function classifyDonation(text: string): Promise<Donation> {
  try {
    const res = await fetch(`${nimConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY || ""}`,
      },
      body: JSON.stringify({
        model: nimConfig.model,
        messages: [{ role: "user", content: text }],
      }),
    });
    const data = (await res.json()) as any;
    return donationSchema.parse(
      JSON.parse(data.choices?.[0]?.message?.content || "{}")
    ) as Donation;
  } catch {
    const cached = heuristicCache.get(text) || heuristic(text);
    if (cached) return cached;
    return donationSchema.parse({
      donation_type: "unknown",
      urgency_level: "low",
      recipient_need_category: "general",
      confidence_score: 0.1,
    }) as Donation;
  }
}
