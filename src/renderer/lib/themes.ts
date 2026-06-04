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
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export function getThemeById(themeId: string) {
  return THEMES.find(theme => theme.id === themeId)
}
