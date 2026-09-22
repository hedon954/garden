const siteTimeZone = "Asia/Shanghai";
const siteTimeOffset = "+08:00";
const civilDatePattern =
  /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/;

const clockInShanghai = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: siteTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
};

export function formatAuthorDate(now = new Date()) {
  const clock = clockInShanghai(now);
  return `${clock.year}-${clock.month}-${clock.day} ${clock.hour}:${clock.minute}:${clock.second}`;
}

export function canonicalSiteDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  const match = civilDatePattern.exec(text);
  if (match) {
    const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
    const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}${siteTimeOffset}`;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return null;
    const clock = clockInShanghai(parsed);
    if (
      clock.year !== year ||
      clock.month !== month ||
      clock.day !== day ||
      clock.hour !== hour ||
      clock.minute !== minute ||
      clock.second !== second
    ) {
      return null;
    }
    return iso;
  }
  return Number.isNaN(Date.parse(text)) ? null : text;
}
