import { parseIcyResponse } from '@music-metadata/icy'
import type { WebContents } from 'electron'

import type { RadioMetadata } from 'shared/types'

const FM_O_DIA_ID = '648261db9770c6cc4d305f46'
const FM_O_DIA_METADATA_URL =
  'https://www.fmodia.com.br/wp-admin/admin-ajax.php?action=get_live_infos'
const FM_O_DIA_POLL_INTERVAL = 15_000
const ICY_RECONNECT_INTERVAL = 5_000

interface FmODiaResponse {
  infos?:
    | false
    | {
        EventType?: string
        Subtitle?: string
        Title?: string
      }
  prom?: {
    title?: string
  }
}

const activeMonitors = new Map<number, AbortController>()
const observedWebContents = new Set<number>()

function cleanMetadataValue(value: string | undefined) {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function sendMetadata(webContents: WebContents, metadata: RadioMetadata) {
  if (!webContents.isDestroyed()) {
    webContents.send('radio:metadata', metadata)
  }
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>(resolve => {
    const finish = () => {
      clearTimeout(timeout)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const timeout = setTimeout(finish, ms)

    signal.addEventListener('abort', finish, { once: true })
  })
}

async function monitorFmODia(
  webContents: WebContents,
  radioId: string,
  signal: AbortSignal
) {
  let previousMetadata = ''

  while (!signal.aborted) {
    try {
      const response = await fetch(FM_O_DIA_METADATA_URL, {
        signal,
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`FM O Dia metadata returned ${response.status}`)
      }

      const data = (await response.json()) as FmODiaResponse
      const infos = data.infos || null
      const title = cleanMetadataValue(
        infos ? infos.Title : data.prom?.title
      )
      const subtitle = infos ? cleanMetadataValue(infos.Subtitle) : ''
      const metadataKey = `${title}\u0000${subtitle}`

      if (title && metadataKey !== previousMetadata) {
        previousMetadata = metadataKey
        sendMetadata(webContents, {
          isMusic: infos?.EventType === 'Song',
          radioId,
          title,
          ...(subtitle ? { subtitle } : {}),
        })
      }
    } catch (error) {
      if (!signal.aborted) {
        console.warn('[radio-metadata] FM O Dia metadata failed:', error)
      }
    }

    await wait(FM_O_DIA_POLL_INTERVAL, signal)
  }
}

async function monitorIcyStream(
  webContents: WebContents,
  radioId: string,
  url: string,
  signal: AbortSignal
) {
  let previousTitle = ''

  while (!signal.aborted) {
    await readIcyStream(url, signal, title => {
      if (title === previousTitle) {
        return
      }

      previousTitle = title
      sendMetadata(webContents, { isMusic: true, radioId, title })
    })

    await wait(ICY_RECONNECT_INTERVAL, signal)
  }
}

async function readIcyStream(
  url: string,
  signal: AbortSignal,
  onTitle: (title: string) => void
) {
  try {
    const response = await fetch(url, {
      signal,
      headers: {
        'Icy-MetaData': '1',
      },
    })

    if (!response.ok) {
      throw new Error(`Radio stream returned ${response.status}`)
    }

    const audioStream = parseIcyResponse(response, ({ metadata }) => {
      const title = cleanMetadataValue(metadata.StreamTitle)

      if (!title || signal.aborted) {
        return
      }

      onTitle(title)
    })
    const reader = audioStream.getReader()

    while (!signal.aborted) {
      const { done } = await reader.read()

      if (done) {
        break
      }
    }

    await reader.cancel()
  } catch (error) {
    if (!signal.aborted) {
      console.warn('[radio-metadata] ICY metadata failed:', error)
    }
  }
}

export function stopRadioMetadataMonitor(webContentsId: number) {
  activeMonitors.get(webContentsId)?.abort()
  activeMonitors.delete(webContentsId)
}

export function startRadioMetadataMonitor(
  webContents: WebContents,
  radioId: string,
  url: string
) {
  stopRadioMetadataMonitor(webContents.id)

  const controller = new AbortController()
  activeMonitors.set(webContents.id, controller)

  if (!observedWebContents.has(webContents.id)) {
    observedWebContents.add(webContents.id)
    webContents.once('destroyed', () => {
      stopRadioMetadataMonitor(webContents.id)
      observedWebContents.delete(webContents.id)
    })
  }

  const monitor =
    radioId === FM_O_DIA_ID
      ? monitorFmODia(webContents, radioId, controller.signal)
      : monitorIcyStream(webContents, radioId, url, controller.signal)

  void monitor.finally(() => {
    if (activeMonitors.get(webContents.id) === controller) {
      activeMonitors.delete(webContents.id)
    }
  })
}
