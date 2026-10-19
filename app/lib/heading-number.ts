/**
 * Pull an author-written section number (`2.`, `4.1`, `4.1.`) into the section
 * marker and leave the heading sentence. The number is kept exactly as
 * written, trailing dot included, so `## 2. KV Cache` shows `2.`.
 */
export const splitHeadingNumber = (text: string) => {
  const match = /^(\d+(?:\.\d+)*\.?)[ \t]+([\s\S]+)$/u.exec(text.trim());
  return match ? { no: match[1], text: match[2] } : null;
};

const NUMBERED_ARTICLE = /^#{2,3}[ \t]+\d/m;

/** True when the article writes its own section numbers (`## 2. …`). */
export const articleUsesHeadingNumbers = (markdown: string) => NUMBERED_ARTICLE.test(markdown);

/**
 * Whether h2/h3 get automatic numbers. Off when the author writes numbers, or
 * when the front matter says `numbering: false`. Author-written numbers are
 * always kept.
 */
export const autoNumbersHeadings = (markdown: string, numbering?: boolean) =>
  numbering !== false && !articleUsesHeadingNumbers(markdown);
