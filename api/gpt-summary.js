// Install dependency:
// npm install openai

import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { items } = req.body;
  // Send each item's first 500 chars to avoid huge prompts
  const inputs = items
    .map(i => `- ${i.title}\n${i.text.substring(0, 500)}...`)
    .join('\n\n');

  const prompt = `
Based on these full-article texts from Google Alerts (last 7 days), write an in-depth analysis of Romanian politics in exactly 6–8 paragraphs.
Each paragraph must be separated by TWO newline characters (i.e. a completely blank line between them).
Focus on key events, shifts in policy or leadership, public reaction, and implications for the coming weeks:

${inputs}
  `.trim();

  try {
    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4',       // or 'gpt-4-turbo'
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7
    });
    const summary = chatRes.choices[0].message.content.trim();
    res.status(200).json({ summary });
  } catch (err) {
    console.error('GPT error:', err);
    res.status(500).json({ error: 'Failed to summarize content.' });
  }
}
