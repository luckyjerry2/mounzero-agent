export async function POST(req: Request) {
  const { input } = await req.json();

  const response = await fetch("https://api.flock.io/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-litellm-api-key": process.env.FLOCK_API_KEY!,
    },
    body: JSON.stringify({
      model: "qwen3-30b-a3b-instruct-2507",
      messages: [
        {
          role: "system",
          content: `You are MounZero Agent, an AI spending gatekeeper.

Your job is to decide whether a spending request should be BLOCKED or APPROVED.

Return ONLY valid JSON:
{
  "decision": "BLOCKED or APPROVED",
  "reason": "short explanation",
  "suggested_action": "one concrete alternative or next step",
  "category": "emotional_spending | emotional_eating | essential_purchase | education | health | bills | transportation | other",
  "risk_level": "LOW | MEDIUM | HIGH",
  "confidence": 0.0
}

Decision rules:
- If the user mentions stress, sadness, boredom, cravings, late-night food, sugary drinks, junk food, fried chicken, impulse buying, delivery food, snacks, or emotional spending, return "BLOCKED".
- If the purchase is clearly necessary for school, work, health, bills, transportation, or essential living, return "APPROVED".
- Late-night food, sugary drinks, delivery food, snacks, and comfort purchases should usually be "BLOCKED", especially when stress or craving is mentioned.
- For BLOCKED cases, use HIGH risk_level when emotion + unnecessary spending are both present.
- For APPROVED cases, use LOW risk_level when the purchase is clearly necessary.
- confidence must be a number between 0 and 1.
- Do not return ALLOW, BLOCK, WARNING, or any other label.
- Only use BLOCKED or APPROVED.`,
        },
        {
          role: "user",
          content: input,
        },
      ],
    }),
  });

  const data = await response.json();

  return Response.json({
    result: data.choices?.[0]?.message?.content ?? JSON.stringify(data),
  });
}