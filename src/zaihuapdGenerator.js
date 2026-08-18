import RSS from 'rss';
import * as cheerio from 'cheerio';
import { config } from './config.js';
import { fetchRSSFeed } from './fetcher.js';

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanItemTitle(title) {
  return String(title || '')
    .replace(/^(?:(?:↩\uFE0F?|🖼\uFE0F?|🎬\uFE0F?)\s*)+/u, '')
    .trim();
}

function removeLeadingBreaks($, container) {
  for (const child of container.contents().toArray()) {
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

function trimAfterMarker($, marker) {
  const siblings = marker?.parent?.children;
  if (!siblings) {
    return;
  }
  const index = siblings.indexOf(marker);
  if (index >= 0) {
    siblings.splice(index);
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

export function cleanZaihuapdBody(description, title) {
  const $ = cheerio.load(description || '', null, false);
  $('a').removeAttr('onclick');

  $('.rsshub-quote blockquote').each((_, element) => {
    const firstParagraph = $(element).children('p').first();
    const channelLink = firstParagraph.find('a[href*="t.me/zaihuapd" i]');
    if (channelLink.length) {
      firstParagraph.remove();
    }
  });

  const currentParagraph = $.root().children('p').first();
  const firstBold = currentParagraph.children('b').first();
  if (normalizedText(firstBold.text()) === normalizedText(title)) {
    firstBold.remove();
    removeLeadingBreaks($, currentParagraph);
  }

  $('span.emoji')
    .toArray()
    .filter(element => ['🌸', '🍀', '🍵'].includes(normalizedText($(element).text())))
    .forEach(marker => trimAfterMarker($, marker));

  return $.html().trim();
}

function buildSummary(content, fallbackTitle, maxLength = 280) {
  const $ = cheerio.load(content || '', null, false);
  $('.rsshub-quote').remove();
  $('p, div, li, blockquote, h1, h2, h3, h4, h5, h6, br, figure').each((_, element) => {
    $(element).append(' ');
  });
  const text = normalizedText($.root().text()) || fallbackTitle;
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildZaihuapdFeedXml(sourceXml, baseUrl) {
  const source = cheerio.load(sourceXml, { xmlMode: true });
  const channel = source('channel').first();
  const items = source('item');
  if (!channel.length || !items.length) {
    throw new Error('Zaihuapd RSS feed has no channel items');
  }

  const feed = new RSS({
    title: '科技圈',
    description: '科技资讯',
    feed_url: `${baseUrl}/zaihuapd`,
    site_url: channel.children('link').text(),
    language: 'zh-CN',
    pubDate: new Date(),
    ttl: 30,
  });

  items.each((_, element) => {
    const item = source(element);
    const title = cleanItemTitle(item.children('title').text());
    const content = cleanZaihuapdBody(item.children('description').text(), title);
    feed.item({
      title,
      description: buildSummary(content, title),
      url: item.children('link').text(),
      guid: item.children('guid').text() || item.children('link').text(),
      date: item.children('pubDate').text() || new Date(),
      custom_elements: [{ 'content:encoded': { _cdata: content } }],
    });
  });

  return feed.xml({ indent: true });
}

export async function generateZaihuapdRSS(baseUrl) {
  const sourceXml = await fetchRSSFeed(config.zaihuapd.feedUrl, {
    headers: { Referer: config.zaihuapd.baseUrl },
  });
  return buildZaihuapdFeedXml(sourceXml, baseUrl);
}
