// 📁 /api/fetch-feed.js

const Parser = require('rss-parser');
const parser = new Parser();
const FEED_URL =
  'https://www.google.com/alerts/feeds/02487025575172519413/3645769323153775559';

module.exports = async (req, res) => {
  try {
    // 1) Fetch the raw RSS XML
    const feedResp = await fetch(FEED_URL);
    const rssText = await feedResp.text();

    if (!feedResp.ok) {
      // Return both status and a snippet of the body
      const snippet = rssText.substring(0, 200).replace(/\n/g, '');
      throw new Error(`Feed fetch HTTP ${feedResp.status}\n--- RAW RSS (first 200 chars) ---\n${snippet}`);
    }

    // 2) Parse it
    const feed = await parser.parseString(rssText);

    // 3) Filter to last 7 days
    const cutoffTs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const items = feed.items || [];

    const recent = items
      .filter(item => {
        const d = new Date(item.isoDate || item.pubDate || 0).getTime();
        return d >= cutoffTs;
      })
      .sort((a, b) =>
        new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate)
      );

    // 4) Return simplified list
    const simplified = recent.map(i => ({
      title:       i.title,
      link:        i.link,
      description: i.contentSnippet || '',
      pubDate:     i.isoDate || i.pubDate
    }));

    return res.status(200).json(simplified);

  } catch (err) {
    console.error('fetch-feed error:', err);
    // Expose the full error message in JSON for your front-end to display
    return res.status(500).json({ error: err.message });
  }
};
