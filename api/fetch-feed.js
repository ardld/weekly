// 📁 /api/fetch-feed.js
import Parser from 'rss-parser';

const parser = new Parser();

// Your three Alert feeds:
const FEED_URLS = [
  'https://www.google.com/alerts/feeds/02487025575172519413/13973157119995789772',
  'https://www.google.com/alerts/feeds/02487025575172519413/2810545558033706307',
  'https://www.google.com/alerts/feeds/02487025575172519413/14598303614598418756'
];

export default async function handler(req, res) {
  try {
    // 1) Fetch & parse each feed’s raw XML
    const feeds = await Promise.all(
      FEED_URLS.map(async url => {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch ${url}: HTTP ${resp.status}`);
        const xml = await resp.text();
        return parser.parseString(xml);
      })
    );

    // 2) Flatten + dedupe by link
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

    // 3) Filter to last 7 days (include items without dates)
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = allItems.filter(item => {
      const dateStr = item.isoDate || item.pubDate;
      if (dateStr) {
        return new Date(dateStr).getTime() >= cutoff;
      }
      return true;  // no date? include it
    });

    // 4) Sort newest first
    recent.sort((a, b) => {
      const da = new Date(a.isoDate || a.pubDate || 0).getTime();
      const db = new Date(b.isoDate || b.pubDate || 0).getTime();
      return db - da;
    });

    // 5) Simplify payload
    const output = recent.map(i => ({
      title:       i.title,
      link:        i.link,
      description: i.contentSnippet || '',
      pubDate:     i.isoDate || i.pubDate
    }));

    return res.status(200).json(output);

  } catch (err) {
    console.error('fetch-feed error:', err);
    return res.status(500).json({ error: err.message });
  }
}
