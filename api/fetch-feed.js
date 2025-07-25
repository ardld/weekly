// Install: npm install rss-parser

import Parser from 'rss-parser';
const parser = new Parser();

// Your Google News RSS (or other public feeds)
const FEED_URLS = [
  'https://news.google.com/rss/search?q=Romania%20politica%20when:7d&hl=ro&gl=RO&ceid=RO:ro',
  'https://news.google.com/rss/search?q=site:hotnews.ro%20politica%20when:7d&hl=ro&gl=RO&ceid=RO:ro',
  'https://news.google.com/rss/search?q=site:digi24.ro%20politica%20when:7d&hl=ro&gl=RO&ceid=RO:ro'
];

const MAX_ITEMS = 50;          // keep only the top 50
const SNIPPET_LENGTH = 100;    // truncate to 100 chars

export default async function handler(req, res) {
  try {
    // 1) Load all feeds
    const feeds = await Promise.all(FEED_URLS.map(url => parser.parseURL(url)));

    // 2) Flatten & dedupe by link
    const seen = new Set(), all = [];
    for (const feed of feeds) {
      for (const item of feed.items || []) {
        if (!seen.has(item.link)) {
          seen.add(item.link);
          all.push(item);
        }
      }
    }

    // 3) Filter to last 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = all
      .filter(it => {
        const ts = new Date(it.isoDate || it.pubDate || 0).getTime();
        return ts >= cutoff;
      })
      .sort((a, b) =>
        new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate)
      )
      .slice(0, MAX_ITEMS); // 4) cap to MAX_ITEMS

    // 4) Simplify & truncate snippet
    const output = recent.map(it => ({
      title: it.title,
      link: it.link,
      snippet: (it.contentSnippet || '').substring(0, SNIPPET_LENGTH),
      pubDate: it.isoDate || it.pubDate
    }));

    return res.status(200).json(output);

  } catch (err) {
    console.error('fetch-feed error:', err);
    return res.status(500).json({ error: err.message });
  }
}
