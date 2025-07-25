// 📁 /api/gpt-summary.js
// Requires: npm install openai

import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      throw new Error('Invalid payload: "items" must be an array');
    }

    // Build the input list, falling back to description if text is missing
    const inputs = items
      .map(i => {
        const snippet = (i.text ?? i.description ?? '').substring(0, 500);
        return `- ${i.title}\n${snippet}...`;
      })
      .join('\n\n');

    const prompt = `
Based on these full-article texts from Google Alerts (last 7 days), write an in-depth analysis of Romanian politics in exactly 6–8 paragraphs.
Each paragraph must be separated by TWO newline characters (i.e. a blank line between them).
Focus on key events, shifts in policy or leadership, public reaction, and implications for the coming weeks:

${inputs}
    `.trim();

    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4',           // or 'gpt-4-turbo'
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7
    });

    const summary = chatRes.choices?.[0]?.message?.content?.trim() ?? '';
    return res.status(200).json({ summary });

  } catch (err) {
    console.error('gpt-summary error:', err);
    // Return the real error message so your front‑end can display it
    return res.status(500).json({ error: err.message });
  }
}
