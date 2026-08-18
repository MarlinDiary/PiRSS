import * as cheerio from 'cheerio';
import { config } from './config.js';
import { fetchRSSFeed } from './fetcher.js';

export function isOneVolumeItem(title) {
  return /^\s*VOL(?:UME)?\b/i.test(String(title || ''));
}

export function filterOneFeedXml(rssXml) {
  const $ = cheerio.load(rssXml, { xmlMode: true });
  const $items = $('channel > item');

  if (!$('channel').length || !$items.length) {
    throw new Error('ONE RSS feed has no channel items');
  }

  let removed = 0;
  $items.each((_, element) => {
    const $item = $(element);
    if (isOneVolumeItem($item.children('title').text())) {
      $item.remove();
      removed += 1;
    }
  });

  console.log(`ONE RSS feed: kept ${$items.length - removed}, removed ${removed} VOL item(s)`);
  return $.xml();
}

export async function generateOneRSS() {
  const sourceXml = await fetchRSSFeed(config.one.feedUrl, {
    headers: {
      Referer: config.one.baseUrl,
    },
  });

  return filterOneFeedXml(sourceXml);
}
