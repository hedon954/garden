const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export type DateLang = "zh" | "en";

function shanghaiDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + shanghaiOffsetMs);
}

/** Calendar date in Asia/Shanghai, formatted for the active site language. */
export function demoDateLabel(value: string, lang: DateLang = "zh") {
  const date = shanghaiDate(value);
  if (!date) return value;
  if (lang === "en") {
    return `${EN_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
  }
  return `${date.getUTCFullYear()} 年 ${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日`;
}

/** Home list label. The current Shanghai year drops the year so the column stays narrow. */
export function homeListDate(value: string, now = new Date(), lang: DateLang = "zh") {
  const date = shanghaiDate(value);
  if (!date) return value;
  const today = shanghaiDate(now.toISOString());
  if (lang === "en") {
    const monthDay = `${EN_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
    if (today && date.getUTCFullYear() === today.getUTCFullYear()) return monthDay;
    return `${monthDay}, ${date.getUTCFullYear()}`;
  }
  const monthDay = `${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日`;
  if (today && date.getUTCFullYear() === today.getUTCFullYear()) return monthDay;
  return `${date.getUTCFullYear()} 年 ${monthDay}`;
}

export function demoDateTime(value: string) {
  const date = shanghaiDate(value);
  if (!date) return value.slice(0, 10);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}
