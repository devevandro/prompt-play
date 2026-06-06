import { app, ipcMain, net, protocol } from 'electron'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
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

function checkStreamUrl(url: string, redirectCount = 0): Promise<boolean> {
  return new Promise(resolve => {
    let parsedUrl: URL

    try {
      parsedUrl = new URL(url)
    } catch {
      resolve(false)
      return
    }

    const request = parsedUrl.protocol === 'https:' ? httpsRequest : httpRequest
    const req = request(
      parsedUrl,
      {
        headers: {
          Range: 'bytes=0-1',
          'User-Agent': 'PromptPlay/0.0',
        },
        method: 'GET',
        timeout: 5000,
      },
      response => {
        if (
          response.statusCode !== undefined &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location &&
          redirectCount < 3
        ) {
          const redirectUrl = new URL(response.headers.location, parsedUrl)

          response.resume()
          req.destroy()
          resolve(checkStreamUrl(redirectUrl.toString(), redirectCount + 1))
          return
        }

        const isLive =
          response.statusCode !== undefined &&
          response.statusCode >= 200 &&
          response.statusCode < 300

        response.resume()
        req.destroy()
        resolve(isLive)
      }
    )

    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })

    req.on('error', () => {
      resolve(false)
    })

    req.end()
  })
}

makeAppWithSingleInstanceLock(async () => {
  await app.whenReady()

  ipcMain.handle('app:quit', () => {
    app.quit()
  })

  ipcMain.handle('radio:check-stream', (_event, url: string) =>
    checkStreamUrl(url)
  )

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
