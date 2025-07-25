// npm install rss-parser

import Parser from 'rss-parser';
const parser = new Parser();

const FEED_URLS = [
  'https://news.google.com/rss/search?q=Romania%20politica%20when:7d&hl=ro&gl=RO&ceid=RO:ro',
  'https://news.google.com/rss/search?q=site:hotnews.ro%20politica%20when:7d&hl=ro&gl=RO&ceid=RO:ro',
  'https://news.google.com/rss/search?q=site:digi24.ro%20politica%20when:7d&hl=ro&gl=RO&ceid=RO:ro'
];

const MAX_ITEMS     = 30;   // ↓ cap lower
const SNIPPET_LENGTH = 80;  // ↓ truncate more

export default async function handler(req, res) {
  try {
    const feeds = await Promise.all(FEED_URLS.map(u => parser.parseURL(u)));
    const seen = new Set(), all = [];
    feeds.forEach(feed => (feed.items||[]).forEach(i => {
      if (!seen.has(i.link)) {
        seen.add(i.link);
        all.push(i);
      }
    }));

    const cutoff = Date.now() - 7*24*60*60*1000;
    const recent = all
      .filter(i => new Date(i.isoDate||i.pubDate||0).getTime() >= cutoff)
      .sort((a,b)=> new Date(b.isoDate||b.pubDate) - new Date(a.isoDate||a.pubDate))
      .slice(0, MAX_ITEMS);

    const output = recent.map(i=>({
      title:       i.title,
      link:        i.link,
      snippet:     (i.contentSnippet||'').substring(0, SNIPPET_LENGTH),
      pubDate:     i.isoDate || i.pubDate
    }));

    return res.status(200).json(output);
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
