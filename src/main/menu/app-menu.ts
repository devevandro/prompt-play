import { app, BrowserWindow, dialog, Menu, shell } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { join } from 'node:path'

import { ENVIRONMENT } from 'shared/constants'
import { version } from '../../../package.json'

function sendCommand(command: string) {
  BrowserWindow.getFocusedWindow()?.webContents.send('menu:command', command)
}

function showAbout() {
  const window = BrowserWindow.getFocusedWindow()
  const options = {
    buttons: ['OK'],
    detail: `Version ${version}`,
    message: 'Prompt Play',
    type: 'info' as const,
  }

  if (window) {
    void dialog.showMessageBox(window, options)
    return
  }

  void dialog.showMessageBox(options)
}

function showUpdateStatus() {
  const window = BrowserWindow.getFocusedWindow()
  const options = {
    buttons: ['OK'],
    detail: 'Automatic updates are not configured for this build yet.',
    message: 'Prompt Play is up to date',
    type: 'info' as const,
  }

  if (window) {
    void dialog.showMessageBox(window, options)
    return
  }

  void dialog.showMessageBox(options)
}

function getViewMenu(): MenuItemConstructorOptions {
  const submenu: MenuItemConstructorOptions[] = [
    { label: 'Reload', role: 'reload' },
    { label: 'Force Reload', role: 'forceReload' },
  ]

  if (ENVIRONMENT.IS_DEV) {
    submenu.push({ label: 'Toggle Developer Tools', role: 'toggleDevTools' })
  }

  return {
    label: 'View',
    submenu,
  }
}

function getEditMenu(): MenuItemConstructorOptions {
  return {
    label: 'Edit',
    submenu: [
      { label: 'Undo', role: 'undo' },
      { label: 'Redo', role: 'redo' },
      { type: 'separator' },
      { label: 'Cut', role: 'cut' },
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste' },
      { label: 'Select All', role: 'selectAll' },
    ],
  }
}

function getHelpMenu(): MenuItemConstructorOptions {
  return {
    label: 'Help',
    submenu: [
      {
        click: () => {
          void shell.openPath(join(app.getAppPath(), 'README.md'))
        },
        label: 'Documentation',
      },
      {
        click: () => sendCommand('help'),
        label: 'Commands',
      },
    ],
  }
}

function getPromptPlayMenu(): MenuItemConstructorOptions {
  const submenu: MenuItemConstructorOptions[] = [
    {
      click: showAbout,
      label: 'About Prompt Play',
    },
    {
      click: () => sendCommand('music config'),
      label: 'Settings',
    },
    {
      click: () => sendCommand('theme list'),
      label: 'Themes',
    },
    {
      click: showUpdateStatus,
      label: 'Check for Updates',
    },
  ]

  if (process.platform === 'darwin') {
    submenu.push({ type: 'separator' }, { label: 'Quit', role: 'quit' })
  } else {
    submenu.push(
      {
        click: () => {
          app.relaunch()
          app.exit(0)
        },
        label: 'Restart',
      },
      { label: 'Exit', role: 'quit' }
    )
  }

  return {
    label: 'Prompt Play',
    submenu,
  }
}

export function registerAppMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      getPromptPlayMenu(),
      getEditMenu(),
      getViewMenu(),
      getHelpMenu(),
    ])
  )
}
