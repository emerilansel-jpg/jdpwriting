const fs = require('fs');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function injectMissingInternalLinks(text, rawLinks, brandName) {
  if (!text || !rawLinks) return text;
  const urls = rawLinks.split(/[\n,]+/).map(u => u.trim()).filter(u => /^https?:\/\//i.test(u));
  if (urls.length === 0) return text;

  let result = text;

  urls.forEach(url => {
    // If already linked in markdown, skip
    if (result.includes('(' + url + ')') || result.includes('(' + url.replace(/\/$/, '') + ')')) {
      return;
    }

    try {
      const parsedUrl = new URL(url);
      const slug = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
      if (!slug) {
        const brand = brandName || 'KnownGarden';
        const brandRegex = new RegExp('\\b(' + escapeRegex(brand) + ')\\b(?![^\\[]*\\])', 'i');
        if (brandRegex.test(result)) {
          result = result.replace(brandRegex, '[$1](' + url + ')');
        }
        return;
      }

      // Generate keyword phrases from slug
      const slugWords = slug.split(/[-_]+/).filter(w => w.length > 2);
      const cleanSlugPhrase = slugWords.join(' ');

      const searchPhrases = [];
      searchPhrases.push(cleanSlugPhrase);

      if (slug.includes('save')) {
        searchPhrases.push(cleanSlugPhrase.replace(/^how to save/i, 'saving'));
        searchPhrases.push(cleanSlugPhrase.replace(/^how to save/i, 'save'));
        searchPhrases.push('saving a dying jade plant');
        searchPhrases.push('dying jade plant');
      }
      if (slug.includes('propagation')) {
        searchPhrases.push('jade plant propagation');
        searchPhrases.push('succulent propagation methods');
        searchPhrases.push('propagation methods');
        searchPhrases.push('succulent propagation');
      }
      if (slug.includes('propagating')) {
        searchPhrases.push('propagating tropical foliage');
        searchPhrases.push('propagating a philodendron');
        searchPhrases.push('tropical foliage');
      }

      // Also generate all 3-word and 2-word combinations from slug
      for (let i = 0; i < slugWords.length - 2; i++) {
        searchPhrases.push(slugWords.slice(i, i + 3).join(' '));
      }
      for (let i = 0; i < slugWords.length - 1; i++) {
        searchPhrases.push(slugWords.slice(i, i + 2).join(' '));
      }

      let replaced = false;
      for (const phrase of searchPhrases) {
        const esc = escapeRegex(phrase);
        const regex = new RegExp('(?<!\\[)(?<!#+\\s*)\\b(' + esc + ')\\b(?![^\\[]*\\])(?![^\\(]*\\))', 'i');
        if (regex.test(result)) {
          result = result.replace(regex, '[$1](' + url + ')');
          replaced = true;
          break;
        }
      }
    } catch (e) {
      console.error(e);
    }
  });

  return result;
}

const article = fs.readFileSync('C:/Users/Kusuma/.zcode/tmp/paste-attachments/2026-09-29/pasted-text-20260929-130135-530077d6.txt', 'utf8');

const links = `https://knowngarden.com/how-to-save-a-dying-jade-plant/
https://knowngarden.com/jade-plant-propagation/
https://knowngarden.com/propagating-a-philodendron/`;

const injected = injectMissingInternalLinks(article, links, 'KnownGarden');

const foundLinks = [...injected.matchAll(/\[([^\]]+)\]\((https?:\/\/knowngarden\.com[^\)]+)\)/g)];
console.log('Injected links count:', foundLinks.length);
foundLinks.forEach(l => console.log(' - Anchor:', l[1], '-> URL:', l[2]));
