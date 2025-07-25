// 📁 /api/fetch-feed.js

// Ensure these are in your dependencies:
//   "rss-parser": "^3.13.0",
//   "jsdom": "^22.1.0",
//   "@mozilla/readability": "^0.4.4"

const Parser = require('rss-parser');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const parser = new Parser();
const FEED_URL =
  'https://www.google.com/alerts/feeds/02487025575172519413/3645769323153775559';

module.exports = async (req, res) => {
  try {
    // 1. Fetch and parse the RSS
    const feed = await parser.parseURL(FEED_URL);

    // 2. Compute cutoff (7 days ago)
    const cutoffTs = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // 3. Filter, sort, and scrape each item
    const enriched = await Promise.all(
      feed.items
        .filter(item => {
          const d = new Date(item.isoDate || item.pubDate || 0).getTime();
          return d >= cutoffTs;
        })
        .sort((a, b) =>
          new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate)
        )
        .map(async item => {
          let text = item.contentSnippet || '';
          try {
            const html = await fetch(item.link).then(r => r.text());
            const dom = new JSDOM(html, { url: item.link });
            const article = new Readability(dom.window.document).parse();
            if (article?.textContent) text = article.textContent;
          } catch (scrapeErr) {
            console.warn(`Scrape failed for ${item.link}:`, scrapeErr);
          }
          return {
            title:   item.title,
            link:    item.link,
            text,
            pubDate: item.isoDate || item.pubDate,
          };
        })
    );

    return res.status(200).json(enriched);

  } catch (err) {
    // DEBUG: return actual error to client
    console.error('[31mfetch-feed error:[0m', err);
    return res
      .status(500)
      .json({ error: err.message, stack: err.stack.split('\n') });
  }
};
