// Install: npm install rss-parser
import Parser from 'rss-parser';

const parser = new Parser();
const FEED_URL = 'https://www.google.com/alerts/feeds/02487025575172519413/3645769323153775559';

export default async function handler(req, res) {
  try {
    const feed = await parser.parseURL(FEED_URL);

    // Compute cutoff: 7 days ago
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const recentItems = feed.items
      // keep only those with a pubDate/isoDate ≥ cutoff
      .filter(item => {
        const date = item.isoDate 
          ? new Date(item.isoDate) 
          : new Date(item.pubDate || 0);
        return date >= cutoff;
      })
      // optional: sort newest→oldest
      .sort((a, b) => new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate))
      // map to the shape your frontend expects
      .map(item => ({
        title:       item.title,
        link:        item.link,
        description: item.contentSnippet || '',
        pubDate:     item.isoDate || item.pubDate
      }));

    res.status(200).json(recentItems);
  } catch (err) {
    console.error('Error fetching RSS:', err);
    res.status(500).json({ error: 'Failed to fetch RSS feed.' });
  }
}
