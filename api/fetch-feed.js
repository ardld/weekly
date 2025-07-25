// 📁 /api/fetch-feed.js

import Parser from 'rss-parser';

const parser = new Parser();

// Your three Google Alerts RSS URLs:
const FEED_URLS = [
  'https://www.google.com/alerts/feeds/02487025575172519413/13973157119995789772',
  'https://www.google.com/alerts/feeds/02487025575172519413/2810545558033706307',
  'https://www.google.com/alerts/feeds/02487025575172519413/14598303614598418756'
];

export default async function handler(req, res) {
  try {
    // Fetch & parse all feeds in parallel
    const feeds = await Promise.all(
      FEED_URLS.map(url => parser.parseURL(url))
    );

    // Flatten items and dedupe by link
    const seen = new Set();
    const allItems = [];
    for (const feed of feeds) {
      for (const item of feed.items || []) {
        if (!seen.has(item.link)) {
          seen.add(item.link);
          allItems.push(item);
        }
      }
    }

    // Filter to the last 7 days and sort newest first
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = allItems
      .filter(item => {
        const ts = new Date(item.isoDate || item.pubDate || 0).getTime();
        return ts >= cutoff;
      })
      .sort((a, b) =>
        new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate)
      );

    // Simplify the payload
    const output = recent.map(item => ({
      title:       item.title,
      link:        item.link,
      description: item.contentSnippet || '',
      pubDate:     item.isoDate || item.pubDate
    }));

    return res.status(200).json(output);

  } catch (err) {
    console.error('fetch-feed error:', err);
    return res.status(500).json({ error: err.message });
  }
}
