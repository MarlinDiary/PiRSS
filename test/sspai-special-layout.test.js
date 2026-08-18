import test from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { scrapeArticleContent } from '../src/scraper.js';

const cases = [
  {
    name: '派早报',
    url: 'https://sspai.com/post/113566',
    minimumTextChars: 3000,
  },
  {
    name: '派评',
    url: 'https://sspai.com/post/113544',
    minimumTextChars: 7000,
  },
];

test('SSPAI special layouts select the article body instead of promo blocks', async () => {
  const results = await Promise.all(
    cases.map(async article => {
      const content = await scrapeArticleContent(article.url);
      const $ = cheerio.load(content);
      return {
        ...article,
        hasDocumentWrapper: /^\s*<html[\s>]/i.test(content),
        textChars: $.text().replace(/\s+/g, ' ').trim().length,
        paragraphs: $('p').length,
      };
    })
  );

  for (const result of results) {
    assert.ok(
      result.textChars >= result.minimumTextChars,
      `${result.name} returned only ${result.textChars} text chars`
    );
    assert.ok(result.paragraphs >= 5, `${result.name} returned only ${result.paragraphs} paragraphs`);
    assert.equal(result.hasDocumentWrapper, false, `${result.name} returned a full HTML document wrapper`);
  }
});
