import { BrowserWindow } from 'electron'
import { join } from 'node:path'

import type { WindowProps } from 'shared/types'

import { registerRoute } from 'lib/electron-router-dom'
import { getRendererStaticServerUrl } from 'main/renderer/static-server'
import { ENVIRONMENT } from 'shared/constants'

export function createWindow({ id, ...settings }: WindowProps) {
  const window = new BrowserWindow(settings)
  const rendererUrl = getRendererStaticServerUrl()

  if (!ENVIRONMENT.IS_DEV && rendererUrl) {
    window.loadURL(`${rendererUrl}/#/${id}`)
    window.on('closed', window.destroy)
    return window
  }

  registerRoute({
    id,
    browserWindow: window,
    htmlFile: join(__dirname, '../renderer/index.html'),
  })

  window.on('closed', window.destroy)

  return window
}
