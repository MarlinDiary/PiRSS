import RSS from 'rss';
import * as cheerio from 'cheerio';
import { config } from './config.js';
import { fetchRSSFeed } from './fetcher.js';

function cleanChannelTitle(title) {
  return String(title || '').replace(/\s*-\s*Telegram Channel\s*$/i, '').trim();
}

function cleanItemTitle(title) {
  return String(title || '').replace(/^\s*🖼\uFE0F?\s*/u, '').trim();
}

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function removeLeadingBreaks($, $container) {
  const children = $container.contents().toArray();
  for (const child of children) {
    if (child.type === 'text' && !normalizedText(child.data)) {
      $(child).remove();
      continue;
    }
    if (child.type === 'tag' && child.name === 'br') {
      $(child).remove();
      continue;
    }
    break;
  }
}

function removeTelegramFooter($) {
  const marker = $('span.emoji')
    .toArray()
    .find(element => ['🏷', '📢'].includes(normalizedText($(element).text())));

  if (!marker?.parent?.children) {
    return;
  }

  const siblings = marker.parent.children;
  const markerIndex = siblings.indexOf(marker);
  if (markerIndex >= 0) {
    siblings.splice(markerIndex);
  }

  while (siblings.length) {
    const last = siblings[siblings.length - 1];
    if ((last.type === 'text' && !normalizedText(last.data)) || (last.type === 'tag' && last.name === 'br')) {
      siblings.pop();
      continue;
    }
    break;
  }
}

export function cleanKejiquBody(description, title) {
  const $ = cheerio.load(description || '', null, false);
  $('a').removeAttr('onclick');

  const firstParagraph = $('p').first();
  const firstBold = firstParagraph.children('b').first();
  if (normalizedText(firstBold.text()) === normalizedText(title)) {
    firstBold.remove();
    removeLeadingBreaks($, firstParagraph);
  }

  removeTelegramFooter($);
  return $.html().trim();
}

function buildSummary(content, fallbackTitle, maxLength = 280) {
  const $ = cheerio.load(content || '', null, false);
  $('p, div, li, blockquote, h1, h2, h3, h4, h5, h6, br, figure').each((_, element) => {
    $(element).append(' ');
  });
  const text = normalizedText($.root().text()) || fallbackTitle;
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildKejiquFeedXml(sourceXml, baseUrl) {
  const source = cheerio.load(sourceXml, { xmlMode: true });
  const channel = source('channel').first();
  const items = source('item');

  if (!channel.length || !items.length) {
    throw new Error('Kejiqu RSS feed has no channel items');
  }

  const feed = new RSS({
    title: cleanChannelTitle(channel.children('title').text()),
    description: channel.children('description').text(),
    feed_url: `${baseUrl}/kejiqu`,
    site_url: channel.children('link').text(),
    language: 'zh-CN',
    pubDate: new Date(),
    ttl: 30,
  });

  items.each((_, element) => {
    const item = source(element);
    const title = cleanItemTitle(item.children('title').text());
    const content = cleanKejiquBody(item.children('description').text(), title);

    feed.item({
      title,
      description: buildSummary(content, title),
      url: item.children('link').text(),
      guid: item.children('guid').text() || item.children('link').text(),
      date: item.children('pubDate').text() || new Date(),
      custom_elements: [
        {
          'content:encoded': {
            _cdata: content,
          },
        },
      ],
    });
  });

  return feed.xml({ indent: true });
}

export async function generateKejiquRSS(baseUrl) {
  const sourceXml = await fetchRSSFeed(config.kejiqu.feedUrl, {
    headers: {
      Referer: config.kejiqu.baseUrl,
    },
  });
  return buildKejiquFeedXml(sourceXml, baseUrl);
}
