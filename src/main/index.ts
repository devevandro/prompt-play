import { app } from 'electron'

import { makeAppWithSingleInstanceLock } from 'lib/electron-app/factories/app/instance'
import { makeAppSetup } from 'lib/electron-app/factories/app/setup'
import { loadReactDevtools } from 'lib/electron-app/utils'
import {
  registerLocalAudioProtocol,
  registerLocalAudioScheme,
} from 'main/audio/local-audio-protocol'
import { registerPlayerIpc } from 'main/ipc/register-player-ipc'
import { registerAppMenu } from 'main/menu/app-menu'
import { ENVIRONMENT } from 'shared/constants'
import { waitFor } from 'shared/utils'
import { MainWindow } from './windows/main'

registerLocalAudioScheme()

makeAppWithSingleInstanceLock(async () => {
  await app.whenReady()

  registerPlayerIpc()
  registerLocalAudioProtocol()
  registerAppMenu()

  const window = await makeAppSetup(MainWindow)

  if (ENVIRONMENT.IS_DEV) {
    await loadReactDevtools()
    window.webContents.once('devtools-opened', async () => {
      await waitFor(1000)
      window.webContents.reload()
    })
  }
})
