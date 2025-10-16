export const formatDateTime = (timestamp: string): string => {
  const now = new Date()
  let date = now
  if (timestamp) date = new Date(timestamp)

  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  // Romanian month abbreviations
  const monthNames = [
    'Ian.',
    'Feb.',
    'Mar.',
    'Apr.',
    'Mai',
    'Iun.',
    'Iul.',
    'Aug.',
    'Sep.',
    'Oct.',
    'Nov.',
    'Dec.',
  ]

  const monthName = monthNames[month]

  return `${day} ${monthName} ${year}`
}
