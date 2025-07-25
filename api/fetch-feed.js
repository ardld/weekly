// Install: npm install rss-parser
import Parser from 'rss-parser';

const parser = new Parser();
const FEED_URL = 'https://www.google.com/alerts/feeds/02487025575172519413/3645769323153775559';

export default async function handler(req, res) {
  try {
    const feed = await parser.parseURL(FEED_URL);
    const items = feed.items.slice(0, 10).map(item => ({
      title: item.title,
      link: item.link,
      description: item.contentSnippet || ''
    }));
    res.status(200).json(items);
  } catch (err) {
    console.error('Error fetching RSS:', err);
    res.status(500).json({ error: 'Failed to fetch RSS feed.' });
  }
}
