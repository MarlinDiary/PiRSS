import test from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { filterOneFeedXml } from '../src/oneGenerator.js';

const sourceXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>ONE · 一个</title>
    <description>ONE · 一个全文RSS。</description>
    <link>http://wufazhuce.com</link>
    <item>
      <title><![CDATA[回避型人格在社交中如何突破自己？]]></title>
      <link><![CDATA[http://m.wufazhuce.com/question/4686]]></link>
      <description>&lt;p&gt;问答正文&lt;/p&gt;</description>
    </item>
    <item>
      <title><![CDATA[VOL.5064]]></title>
      <link><![CDATA[http://m.wufazhuce.com/one/5196]]></link>
      <description>&lt;p&gt;&lt;span&gt;VOL.5064&lt;/span&gt;摄影&lt;/p&gt;</description>
    </item>
    <item>
      <title><![CDATA[犬牙]]></title>
      <link><![CDATA[http://m.wufazhuce.com/article/7324]]></link>
      <description>&lt;p&gt;文章正文&lt;/p&gt;</description>
    </item>
  </channel>
</rss>`;

test('ONE feed removes every VOL item and preserves other entries', () => {
  const output = filterOneFeedXml(sourceXml);
  const $ = cheerio.load(output, { xmlMode: true });
  const titles = $('item > title').toArray().map(element => $(element).text());

  assert.deepEqual(titles, ['回避型人格在社交中如何突破自己？', '犬牙']);
  assert.equal($('item').length, 2);
  assert.equal($('item').first().find('description').text(), '<p>问答正文</p>');
  assert.equal($('item').last().find('description').text(), '<p>文章正文</p>');
  assert.equal(output.includes('VOL.5064'), false);
});

test('ONE feed matches VOL prefixes case-insensitively', () => {
  const variants = sourceXml
    .replace('VOL.5064', 'volume 5064')
    .replace('VOL.5064', 'volume 5064');
  const output = filterOneFeedXml(variants);
  const $ = cheerio.load(output, { xmlMode: true });

  assert.equal($('item').length, 2);
  assert.equal($('item > title').toArray().some(element => /^vol/i.test($(element).text())), false);
});
