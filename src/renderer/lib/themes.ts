export const DEFAULT_THEME_ID = 'claude-code'

export const THEMES = [
  {
    id: 'claude-code',
    name: 'Claude Code',
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
  },
  {
    id: 'dark-soul',
    name: 'Dark Soul',
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

function normalizeThemeInput(theme: string) {
  return theme
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
}

export function getThemeById(themeId: string) {
  const normalizedThemeId = normalizeThemeInput(themeId)

  return THEMES.find(
    theme =>
      theme.id === normalizedThemeId ||
      normalizeThemeInput(theme.name) === normalizedThemeId
  )
}
