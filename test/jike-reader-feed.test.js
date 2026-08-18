import test from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { buildTelegramFeedXml } from '../src/telegramTelegraphGenerator.js';

const sourceItem = {
  title: '2026年8月18日',
  description: '<p>第一段正文</p><p><img src="https://example.com/photo.jpg"></p><p>第二段正文</p>',
  link: 'https://t.me/jike_collection/11909',
  guid: 'https://t.me/jike_collection/11909',
  pubDate: 'Tue, 18 Aug 2026 00:00:00 GMT',
};

test('Reader-compatible Telegram feed separates summary from full body', () => {
  const xml = buildTelegramFeedXml(
    {
      title: '即刻精选',
      description: '即刻精选 Telegram feed',
      route: '/jike',
      baseUrl: 'https://t.me/s/jike_collection',
      author: '即刻精选',
      readerCompatible: true,
    },
    'https://rss.example.com',
    [{ article: sourceItem, content: sourceItem.description, url: sourceItem.link }]
  );

  const $ = cheerio.load(xml, { xmlMode: true });
  const $item = $('item').first();

  assert.equal(
    $('rss').attr('xmlns:content'),
    'http://purl.org/rss/1.0/modules/content/'
  );
  assert.equal($item.find('content\\:encoded').text(), sourceItem.description);
  assert.equal($item.find('description').text(), '第一段正文 第二段正文');
  assert.notEqual($item.find('description').text(), sourceItem.description);
});

test('existing Telegram feeds keep their description-only output', () => {
  const xml = buildTelegramFeedXml(
    {
      title: 'Legacy feed',
      description: 'Legacy Telegram feed',
      route: '/legacy',
      baseUrl: 'https://t.me/s/legacy',
      author: 'Legacy author',
    },
    'https://rss.example.com',
    [{ article: sourceItem, content: sourceItem.description, url: sourceItem.link }]
  );

  const $ = cheerio.load(xml, { xmlMode: true });
  const $item = $('item').first();

  assert.equal($item.find('content\\:encoded').length, 0);
  assert.equal($item.find('description').text(), sourceItem.description);
});
