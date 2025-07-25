import { OpenAI } from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { items } = req.body;
  const headlines = items
    .map(i => `- ${i.title}: ${i.description}`)
    .join('\n');

  const prompt = `
Based on the following news headlines and snippets from Google Alerts (all within the last 7 days), write an in‑depth analysis in 6–8 paragraphs that charts the most important developments in Romanian politics. Focus on key events, shifts in policy or leadership, public reaction, and implications for the coming weeks:

${headlines}
  `.trim();

  try {
    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,       // allows room for 6–8 paragraphs
      temperature: 0.7
    });
    const summary = chatRes.choices[0].message.content.trim();
    res.status(200).json({ summary });
  } catch (err) {
    console.error('GPT error:', err);
    res.status(500).json({ error: 'Failed to summarize content.' });
  }
}
