// npm install openai

import { OpenAI } from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new Error('"items" must be an array');

    // ↓ smaller batches of 10
    const BATCH_SIZE = 10;
    const batches = chunkArray(items, BATCH_SIZE);

    // 1) Compress each batch with gpt-3.5-turbo in parallel
    const miniPromises = batches.map(batch => {
      const prompt = `
Summarize these ${batch.length} Romanian-politics snippets into 2 bullet points. 
Keep each bullet under 50 characters.

${batch.map(i=>`- ${i.title}: ${i.snippet}`).join('\n')}
      `.trim();
      return openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.5
      }).then(r => r.choices[0].message.content.trim());
    });
    const batchSummaries = await Promise.all(miniPromises);

    // 2) Final analysis with gpt-4-turbo
    const combined = batchSummaries.join('\n\n');
    const finalPrompt = `
Based on these bullet-point summaries of Romanian-politics news from the last 7 days, write an in-depth analysis in Romanian, in 6–8 paragraphs.
Act like a political analyst and focus on the most important developments, policy shifts, leadership dynamics, public reaction, and implications:

${combined}
    `.trim();

    const finalRes = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: finalPrompt }],
      max_tokens: 1500,
      temperature: 0.7
    });

    return res.status(200).json({
      summary: finalRes.choices[0].message.content.trim()
    });
  } catch (err) {
    console.error('gpt-summary error:', err);
    return res.status(500).json({ error: err.message });
  }
}
