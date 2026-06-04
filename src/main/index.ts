import { app, ipcMain, net, protocol } from 'electron'
import { pathToFileURL } from 'node:url'

import { makeAppWithSingleInstanceLock } from 'lib/electron-app/factories/app/instance'
import { makeAppSetup } from 'lib/electron-app/factories/app/setup'
import { loadReactDevtools } from 'lib/electron-app/utils'
import { ENVIRONMENT } from 'shared/constants'
import { MainWindow } from './windows/main'
import { waitFor } from 'shared/utils'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-audio',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
])

makeAppWithSingleInstanceLock(async () => {
  await app.whenReady()

  ipcMain.handle('app:quit', () => {
    app.quit()
  })

  protocol.handle('local-audio', request => {
    try {
      const { pathname } = new URL(request.url)
      return net.fetch(pathToFileURL(decodeURIComponent(pathname)).toString())
    } catch {
      return new Response(null, { status: 400 })
    }
  })

  const window = await makeAppSetup(MainWindow)

  if (ENVIRONMENT.IS_DEV) {
    await loadReactDevtools()
    /* This trick is necessary to get the new
      React Developer Tools working at app initial load.
      Otherwise, it only works on manual reload.
    */
    window.webContents.once('devtools-opened', async () => {
      await waitFor(1000)
      window.webContents.reload()
    })
  }
})
