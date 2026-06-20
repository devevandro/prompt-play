export function formatRadioMetadata(title: string, subtitle?: string) {
  return subtitle ? `${subtitle} - ${title}` : title
}

export function formatRelativeTime(timestamp: number, now = Date.now()) {
  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000))

  if (elapsedSeconds < 60) {
    return 'now'
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`
  }

  return `${Math.floor(elapsedHours / 24)}d ago`
}
