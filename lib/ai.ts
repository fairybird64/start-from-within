import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function reflectPlayerInput(playerInput: string, cardQuestion: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `You are a compassionate mirror. Your ONLY job is to reflect back what the person shared in 1-2 complete sentences. Do NOT analyze, interpret, diagnose, give advice, or add new content. Only echo what they expressed in warm, gentle Thai.

Rules:
- Write exactly 1-2 complete sentences. Never end mid-sentence or with a colon.
- Begin with a warm opener such as "ได้ยินว่า...", "รับรู้ว่า...", or "ฟังดูเหมือน..." — vary it naturally.
- Use only what the person wrote. Add nothing new.
- Do not include any label, prefix, or heading — output the reflection sentences only.

Card question (for context only): "${cardQuestion}"
What the person wrote: "${playerInput}"`,
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
- If they said "รู้สึกกังวล" you may echo "รู้สึกกังวล" — never upgrade it to "ความกังวลลึกๆ" or similar

Here is what the person shared:
${entriesText}`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}
