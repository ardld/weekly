// 📁 /api/gpt-summary.js
// npm install openai

import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper to split an array into chunks
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
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      throw new Error('Invalid payload: "items" must be an array');
    }

    // 1) Break into batches of, say, 50 items each
    const BATCH_SIZE = 50;
    const batches = chunkArray(items, BATCH_SIZE);

    // 2) For each batch, ask GPT to compress into 4 bullet points
    const batchSummaries = [];
    for (const batch of batches) {
      const miniPrompt = `
Summarize the key points from these ${batch.length} Romanian‐politics articles into 4 bullet points.  
Provide each bullet as a short sentence.

${batch.map(i =>
  `- ${i.title}: ${ (i.text ?? i.description).substring(0, 200).replace(/\n/g, ' ') }...`
).join('\n')}
      `.trim();

      const miniRes = await openai.chat.completions.create({
        model: 'gpt-4',           // 8K context is fine for 50 items
        messages: [{ role: 'user', content: miniPrompt }],
        max_tokens: 200,
        temperature: 0.5
      });

      const miniSummary = miniRes.choices?.[0]?.message?.content?.trim();
      batchSummaries.push(miniSummary);
    }

    // 3) Combine all mini‑summaries into the final analysis prompt
    const combined = batchSummaries.join('\n\n');
    const finalPrompt = `
Based on these bullet‑point summaries of Romanian‑politics news from the last 7 days, write an in‑depth analysis in exactly 6–8 paragraphs. Please reply in Romanian as a political analyst.   
Each paragraph should explore the most important developments, policy shifts, leadership dynamics, public reaction, and implications for the coming weeks:

${combined}
    `.trim();

    // 4) Call GPT for the final analysis
    const finalRes = await openai.chat.completions.create({
      model: 'gpt-4',           // or 'gpt-4-turbo'
      messages: [{ role: 'user', content: finalPrompt }],
      max_tokens: 1500,
      temperature: 0.7
    });

    const summary = finalRes.choices?.[0]?.message?.content?.trim() ?? '';
    return res.status(200).json({ summary });

  } catch (err) {
    console.error('gpt-summary error:', err);
    return res.status(500).json({ error: err.message });
  }
}
