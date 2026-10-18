/**
 * Pull an author-written section number (`2.`, `4.1`, `4.1.`) into the section
 * marker and leave the heading sentence. The number is kept exactly as
 * written, trailing dot included, so `## 2. KV Cache` shows `2.`.
 */
export const splitHeadingNumber = (text: string) => {
  const match = /^(\d+(?:\.\d+)*\.?)[ \t]+([\s\S]+)$/u.exec(text.trim());
  return match ? { no: match[1], text: match[2] } : null;
};
