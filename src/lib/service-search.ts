const normalizeSearchQuery = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')

export const filterItemsByQuery = <T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string,
): T[] => {
  const normalizedQuery = normalizeSearchQuery(query)

  if (normalizedQuery.length === 0) {
    return items
  }

  return items.filter((item) => getSearchText(item).toLowerCase().includes(normalizedQuery))
}

export const isServiceSearchEmpty = (query: string): boolean => normalizeSearchQuery(query).length === 0
