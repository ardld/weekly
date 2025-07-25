// Requires: npm install openai
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Set in Vercel environment variables
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { items } = req.body;
    const headlines = items.map(item => `- ${item.title}`).join('\n');

    const prompt = `Ești un analist politic de rang înalt. Summarize in Romanian the main themes and trends from the following news headlines:\n${headlines}`;

    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7
    });

    const summary = chatRes.choices[0].message.content.trim();
    res.status(200).json({ summary });
  } catch (err) {
    console.error('GPT error:', err);
    res.status(500).json({ error: 'Failed to summarize content.' });
  }
}
