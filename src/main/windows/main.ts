import { BrowserWindow } from 'electron'
import { join } from 'node:path'

import { createWindow } from 'lib/electron-app/factories/windows/create'

export async function MainWindow() {
  const window = createWindow({
    id: 'main',
    title: 'zsh-player',
    width: 910,
    height: 550,
    minWidth: 910,
    minHeight: 550,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#18191f',
    center: true,
    movable: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: {
      x: 15,
      y: 12,
    },

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  window.webContents.on('did-finish-load', () => {
    // if (ENVIRONMENT.IS_DEV) {
    //   window.webContents.openDevTools({ mode: "detach" });
    // }

    window.show()
  })

  window.on('close', () => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.destroy()
    }
  })

  return window
}
