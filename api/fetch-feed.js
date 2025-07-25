// 📁 /api/fetch-feed.js
// npm install rss-parser jsdom @mozilla/readability

const Parser = require('rss-parser');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const parser = new Parser();
const FEED_URL = 'https://www.google.com/alerts/feeds/02487025575172519413/3645769323153775559';

module.exports = async (req, res) => {
  try {
    const feed = await parser.parseURL(FEED_URL);

    // 7‑day cutoff
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const enriched = await Promise.all(
      feed.items
        .filter(item => {
          const d = new Date(item.isoDate || item.pubDate || 0).getTime();
          return d >= cutoff;
        })
        .sort((a, b) =>
          new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate)
        )
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
            text,
            pubDate: item.isoDate || item.pubDate
          };
        })
    );

    res.status(200).json(enriched);
  } catch (err) {
    console.error('fetch-feed error:', err);
    res.status(500).json({ error: 'Failed to fetch + parse feed/articles.' });
  }
};
