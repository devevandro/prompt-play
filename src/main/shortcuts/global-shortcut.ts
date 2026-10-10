import { app, BrowserWindow, globalShortcut } from 'electron'

import { MainWindow } from 'main/windows/main'

export const OPEN_APP_SHORTCUT = 'CommandOrControl+Alt+P'

async function toggleMainWindow() {
  const [window] = BrowserWindow.getAllWindows()

  if (!window) {
    await MainWindow()
    return
  }

  if (window.isVisible() && window.isFocused()) {
    window.hide()
    return
  }

  if (window.isMinimized()) {
    window.restore()
  }

  window.show()
  window.focus()
  app.focus({ steal: true })
}

export function registerGlobalShortcut() {
  globalShortcut.register(OPEN_APP_SHORTCUT, () => {
    void toggleMainWindow()
  })

  app.once('will-quit', () => globalShortcut.unregisterAll())
}
