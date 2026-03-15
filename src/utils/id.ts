export const toIdString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return toIdString(value[0])
  }
  if (value === null || value === undefined) {
    return undefined
  }
  const id = String(value).trim()
  return id ? id : undefined
}

export const isSameId = (left: unknown, right: unknown): boolean => {
  const leftId = toIdString(left)
  const rightId = toIdString(right)
  if (!leftId || !rightId) {
    return false
  }
  return leftId === rightId
}
