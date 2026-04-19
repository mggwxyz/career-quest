export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function resolveSlugCollisions(
  candidate: string,
  taken: Set<string>,
): string {
  if (!taken.has(candidate))
    return candidate
  let i = 2
  while (taken.has(`${candidate}-${i}`)) i++
  return `${candidate}-${i}`
}
