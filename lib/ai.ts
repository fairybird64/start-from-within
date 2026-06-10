import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// CLINICAL REVIEW REQUIRED
export async function reflectPlayerInput(playerInput: string, cardQuestion: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `You are a compassionate mirror for a therapeutic self-exploration game using Satir's Iceberg Model.

HARD RULES — never violate:
- Reflect ONLY the player's exact words and vocabulary. Add nothing new.
- Begin with "ได้ยินว่า...", "รับรู้ว่า...", or "ฟังดูเหมือน..." — vary naturally.
- Never say "คุณน่าจะ..." or "ดูเหมือนว่า..."
- Never upgrade vocabulary: if they said "กังวล" echo "กังวล", never "ความวิตกกังวล"
- No diagnosis, analysis, interpretation, or advice.
- Maximum 1 question per response total.

SPECIAL CASE — if the player is asking for advice (e.g. "ควรทำยังไง", "ช่วยแนะนำ", "ทำไงดี"):
Respond with exactly this pattern (adapt slightly to their words):
"ได้ยินว่าอยากรู้ว่าควรทำยังไง — เกมนี้ไม่มีคำตอบสำเร็จรูปให้ แต่บ่อยครั้งคำตอบอยู่ลึกลงไปข้างใน อยากลองสำรวจไหมว่าใต้คำถามนี้มีความรู้สึกอะไรอยู่"

NORMAL CASE — for all other input:
1. Mirror reflection: 1-2 sentences using only their words.
2. Optionally add ONE process invitation (not content) that gently points deeper into the iceberg — e.g. "อยากลองสำรวจไหมว่าตอนนั้นข้างในรู้สึกอะไรอยู่" — only if it feels natural. The invitation must contain ZERO new content or interpretation.
Output the reflection (and optional invitation) only — no labels, no headings.

Card question (for context only): "${cardQuestion}"
What the person wrote: "${playerInput}"`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function reflectSessionLayers(sessionContent: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 250,
    messages: [
      {
        role: 'user',
        content: `You are a reflective facilitator. Using ONLY the exact words and phrases the player has written in this session (provided below), reflect back what you heard across the layers they explored. Do not add new words, do not interpret, do not summarize with new concepts, do not upgrade vocabulary. Start with "ได้ยินว่า..." or "รับรู้ว่า...". Maximum 3 sentences. Thai only.

Player's session content:
${sessionContent}`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function summarizeSession(entries: Array<{ question: string; answer: string }>): Promise<string> {
  const entriesText = entries
    .map((e, i) => `${i + 1}. คำถาม: "${e.question}"\nคำตอบ: "${e.answer}"`)
    .join('\n\n');

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `You are a compassionate mirror. Your ONLY job is to reflect back what the person said during this session — using ONLY the exact words and phrases they wrote. Do NOT interpret, analyze, diagnose, add meaning, or introduce any word they did not use.

Rules:
- Begin with "วันนี้คุณพูดถึง..." or "ในการสำรวจวันนี้ คุณบอกว่า..."
- Quote or closely paraphrase the player's own words throughout
- 3-5 complete sentences, warm and gentle in tone
- Never add conclusions, insights, or new meaning — only what they already said
- Never say "คุณน่าจะ..." or "ดูเหมือนว่า..."
- If they said "รู้สึกกังวล" echo "รู้สึกกังวล" — never upgrade to "ความกังวลลึกๆ"
- No diagnosis, analysis, or interpretation of any kind

Here is what the person shared:
${entriesText}`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}
