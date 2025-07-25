// /api/fetch-feed.js
import Parser from 'rss-parser';
const parser = new Parser();

// Replace your old ALERT feeds with these:
const FEED_URLS = [
  // all “Romania politica” items, last 7 days
  'https://news.google.com/rss/search?q=Romania%20politica%20when:7d&hl=ro&gl=RO&ceid=RO:ro',
  // you can add more site‑specific ones if you like:
  'https://news.google.com/rss/search?q=site:hotnews.ro%20politica%20when:7d&hl=ro&gl=RO&ceid=RO:ro',
  'https://news.google.com/rss/search?q=site:digi24.ro%20politica%20when:7d&hl=ro&gl=RO&ceid=RO:ro'
];

export default async function handler(req, res) {
  try {
    const feeds = await Promise.all(FEED_URLS.map(u => parser.parseURL(u)));
    const seen = new Set(), all = [];
    feeds.forEach(feed => (feed.items||[]).forEach(item => {
      if (!seen.has(item.link)) {
        seen.add(item.link);
        all.push(item);
      }
    }));
    // filter to last 7 days
    const cutoff = Date.now() - 7*24*60*60*1000;
    const recent = all
      .filter(i => new Date(i.isoDate||i.pubDate||0).getTime() >= cutoff)
      .sort((a,b)=>new Date(b.isoDate||b.pubDate)-new Date(a.isoDate||a.pubDate));
    res.status(200).json(recent.map(i=>({
      title: i.title, link: i.link,
      description: i.contentSnippet||'', pubDate: i.isoDate||i.pubDate
    })));
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
