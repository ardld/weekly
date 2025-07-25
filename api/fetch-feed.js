// Install dependencies:
// npm install rss-parser node-fetch jsdom @mozilla/readability

import Parser from 'rss-parser';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const parser = new Parser();
const FEED_URL = 'https://www.google.com/alerts/feeds/02487025575172519413/3645769323153775559';

export default async function handler(req, res) {
  try {
    // 1. Parse the RSS feed
    const feed = await parser.parseURL(FEED_URL);

    // 2. Compute 7‑day cutoff
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    // 3. Filter + enrich each item
    const enriched = await Promise.all(
      feed.items
        .filter(item => {
          const d = item.isoDate ? new Date(item.isoDate) : new Date(item.pubDate || 0);
          return d >= cutoff;
        })
        .sort((a, b) => new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate))
        .map(async item => {
          let text = item.contentSnippet || '';
          try {
            const html = await fetch(item.link).then(r => r.text());
            const doc = new JSDOM(html, { url: item.link });
            const article = new Readability(doc.window.document).parse();
            if (article?.textContent) text = article.textContent;
          } catch (e) {
            console.warn(`Scrape failed for ${item.link}:`, e);
          }
          return {
            title:   item.title,
            link:    item.link,
            text,                       // full article text or fallback snippet
            pubDate: item.isoDate || item.pubDate
          };
        })
    );

    res.status(200).json(enriched);
  } catch (err) {
    console.error('Error in fetch-feed:', err);
    res.status(500).json({ error: 'Failed to fetch and parse RSS + articles.' });
  }
}
