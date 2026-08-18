import test from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { buildZaihuapdFeedXml } from '../src/zaihuapdGenerator.js';

const sourceXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel>
  <title>科技圈🎗在花频道📮 - Telegram Channel</title>
  <description>科技资讯 - Powered by RSSHub</description>
  <link>https://t.me/s/zaihuapd</link>
  <item>
    <title><![CDATA[↩️🖼 当前新闻标题]]></title>
    <description><![CDATA[
      <div class="rsshub-quote"><blockquote><p>上一篇新闻 <span class="emoji">🍀</span> 在花频道 <span class="emoji">🍵</span> 茶馆水群</p></blockquote></div>
      <p><b>当前新闻标题</b><br><br>当前完整正文。<a href="https://example.com/story" onclick="return confirm('Open?')">原文</a><br><br><span class="emoji">🌸</span> <a href="https://t.me/ZaiHuaPd">在花频道</a> · <a href="https://t.me/zaihuachat">茶馆水群</a> · <a href="https://t.me/ZaiHuabot">投稿通道</a></p>
      <img src="https://example.com/image.jpg">
    ]]></description>
    <link>https://t.me/zaihuapd/43258</link>
    <guid isPermaLink="false">https://t.me/zaihuapd/43258</guid>
    <pubDate>Tue, 18 Aug 2026 10:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

test('Zaihuapd feed provides a clean Reader body and keeps quote context', () => {
  const xml = buildZaihuapdFeedXml(sourceXml, 'https://rss.example.com');
  const $ = cheerio.load(xml, { xmlMode: true });
  const item = $('item').first();
  const body = item.children('content\\:encoded').text();
  const bodyHtml = cheerio.load(body);

  assert.equal($('channel > title').text(), '科技圈');
  assert.equal($('channel > language').text(), 'zh-CN');
  assert.equal(item.children('title').text(), '当前新闻标题');
  assert.equal(item.children('description').text(), '当前完整正文。原文');
  assert.match(bodyHtml.text(), /上一篇新闻/);
  assert.match(bodyHtml.text(), /当前完整正文/);
  assert.equal(bodyHtml('img').attr('src'), 'https://example.com/image.jpg');
  assert.equal(bodyHtml('a[href="https://example.com/story"]').length, 1);
  assert.equal(bodyHtml('[onclick]').length, 0);
  assert.equal(/在花频道|茶馆水群|投稿通道/.test(bodyHtml.text()), false);
});
