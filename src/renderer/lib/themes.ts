export const THEMES = [
  {
    id: 'default',
    name: 'Default',
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
    id: 'dark-petroleum-blue',
    name: 'Dark Petroleum Blue',
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
  },
  {
    id: 'shell-pink',
    name: 'Shell Pink',
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
