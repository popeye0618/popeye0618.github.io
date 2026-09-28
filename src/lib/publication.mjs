export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
export function isPublished(data, now = new Date()) {
  return (
    data.draft === false &&
    validDate(data.publishedAt) &&
    new Date(data.publishedAt + 'T00:00:00+09:00').getTime() <= now.getTime()
  );
}
export function taxonomySlug(value) {
  return encodeURIComponent(value.toLowerCase());
}
export function readingMinutes(body = '') {
  return Math.max(1, Math.ceil(body.length / 650));
}
