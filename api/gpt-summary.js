// Install: npm install openai

import { OpenAI } from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Utility to chunk an array
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new Error('"items" must be an array');

    // 1) Chunk into batches of 25
    const BATCH_SIZE = 25;
    const batches = chunkArray(items, BATCH_SIZE);

    // 2) Compress each batch into 3 bullet points
    const batchSummaries = [];
    for (const batch of batches) {
      const prompt = `
Summarize these ${batch.length} Romanian-politics snippets into 3 bullet points. Keep each bullet short:

${batch.map(i => `- ${i.title}: ${i.snippet}`).join('\n')}
      `.trim();

      const mini = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.5
      });

      batchSummaries.push(mini.choices[0].message.content.trim());
    }

    // 3) Combine bullet summaries
    const combined = batchSummaries.join('\n\n');
    const finalPrompt = `
Based on these bullet-point summaries of Romanian-politics news from the last 7 days, write an in-depth analysis in Romanian in 6–8 paragraphs. act as a seasoned politica analyst. focus on key developments, policy shifts, leadership, public reaction, and implications:

${combined}
    `.trim();

    // 4) Final analysis
    const final = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: finalPrompt }],
      max_tokens: 1500,
      temperature: 0.7
    });

    return res.status(200).json({ summary: final.choices[0].message.content.trim() });
  } catch (err) {
    console.error('gpt-summary error:', err);
    return res.status(500).json({ error: err.message });
  }
}
