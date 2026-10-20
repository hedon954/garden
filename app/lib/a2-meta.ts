const shanghaiOffsetMs = 8 * 60 * 60 * 1000;

function shanghaiDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + shanghaiOffsetMs);
}

/** Calendar date in Asia/Shanghai, the zone the demo uses for 「2026 年 9 月 18 日」. */
export function demoDateLabel(value: string) {
  const date = shanghaiDate(value);
  if (!date) return value;
  return `${date.getUTCFullYear()} 年 ${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日`;
}

/** Home list label. The current Shanghai year drops the year so the column stays narrow. */
export function homeListDate(value: string, now = new Date(), lang: "zh" | "en" = "zh") {
  const date = shanghaiDate(value);
  if (!date) return value;
  const today = shanghaiDate(now.toISOString());
  const sameYear = Boolean(today && date.getUTCFullYear() === today.getUTCFullYear());
  if (lang === "en") {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    }).format(date);
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
