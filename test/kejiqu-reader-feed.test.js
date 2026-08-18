import test from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { buildKejiquFeedXml } from '../src/kejiquGenerator.js';

const body = '<p><b>科技新闻标题</b><br><br>这里是完整正文。<a href="https://example.com/story" onclick="return confirm(\'Open this link?\')">原文</a><br><br><span class="emoji">🏷</span> <a href="https://t.me/kejiqu/4732?q=%23AI">#AI</a><br><span class="emoji">📢</span> <a href="https://t.me/kejiqu">频道</a> <a href="https://t.me/kejiquchat">群组</a> <a href="https://t.me/kejiqubot">投稿</a></p><img src="https://example.com/image.jpg">';
const sourceXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>科技&amp;趣闻&amp;杂记 - Telegram Channel</title>
    <description>分享有价值、有趣的信息！</description>
    <link>https://t.me/s/kejiqu</link>
    <item>
      <title><![CDATA[🖼 科技新闻标题]]></title>
      <description><![CDATA[${body}]]></description>
      <link>https://t.me/kejiqu/4732</link>
      <guid isPermaLink="false">https://t.me/kejiqu/4732</guid>
      <pubDate>Tue, 18 Aug 2026 09:50:19 GMT</pubDate>
    </item>
  </channel>
</rss>`;

test('Kejiqu feed gives Reader a full body separate from Summary', () => {
  const xml = buildKejiquFeedXml(sourceXml, 'https://rss.example.com');
  const $ = cheerio.load(xml, { xmlMode: true });
  const item = $('item').first();
  const content = item.children('content\\:encoded').text();
  const contentHtml = cheerio.load(content);

  assert.equal($('rss').attr('xmlns:content'), 'http://purl.org/rss/1.0/modules/content/');
  assert.equal($('channel > title').text(), '科技&趣闻&杂记');
  assert.equal($('channel > language').text(), 'zh-CN');
  assert.equal(item.children('title').text(), '科技新闻标题');
  assert.equal(item.children('description').text(), '这里是完整正文。原文');
  assert.equal(contentHtml.text().replace(/\s+/g, ' ').trim(), '这里是完整正文。原文');
  assert.equal(contentHtml('img').attr('src'), 'https://example.com/image.jpg');
  assert.equal(contentHtml('a[href="https://example.com/story"]').length, 1);
  assert.equal(contentHtml('[onclick]').length, 0);
  assert.equal(/#AI|频道|群组|投稿/.test(content), false);
  assert.equal(item.children('link').text(), 'https://t.me/kejiqu/4732');
  assert.equal(item.children('guid').text(), 'https://t.me/kejiqu/4732');
  assert.equal(item.children('pubDate').text(), 'Tue, 18 Aug 2026 09:50:19 GMT');
});
