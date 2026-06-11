import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { Readable } from 'node:stream'

import { protocol } from 'electron'

const AUDIO_CONTENT_TYPES: Record<string, string> = {
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
}

export function registerLocalAudioScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'local-audio',
      privileges: {
        corsEnabled: true,
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
      },
    },
  ])
}

async function createLocalAudioResponse(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const decodedPath = decodeURIComponent(url.pathname)
  const filePath =
    url.hostname === 'file' && decodedPath.startsWith('//')
      ? decodedPath.slice(1)
      : decodedPath
  const fileStats = await stat(filePath)
  const fileSize = fileStats.size
  const contentType =
    AUDIO_CONTENT_TYPES[extname(filePath).toLowerCase()] ??
    'application/octet-stream'
  const rangeHeader = request.headers.get('range')
  const responseHeaders = {
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': contentType,
  }

  if (!rangeHeader) {
    const stream = createReadStream(filePath)

    return new Response(Readable.toWeb(stream) as BodyInit, {
      headers: {
        ...responseHeaders,
        'Content-Length': String(fileSize),
      },
    })
  }

  const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)

  if (!rangeMatch) {
    return new Response(null, { status: 416 })
  }

  const requestedStart = rangeMatch[1] ? Number.parseInt(rangeMatch[1], 10) : 0
  const requestedEnd = rangeMatch[2]
    ? Number.parseInt(rangeMatch[2], 10)
    : fileSize - 1
  const start = Math.max(0, requestedStart)
  const end = Math.min(fileSize - 1, requestedEnd)

  if (start > end || start >= fileSize) {
    return new Response(null, {
      headers: {
        'Content-Range': `bytes */${fileSize}`,
      },
      status: 416,
    })
  }

  const stream = createReadStream(filePath, { end, start })

  return new Response(Readable.toWeb(stream) as BodyInit, {
    headers: {
      ...responseHeaders,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    },
    status: 206,
  })
}

export function registerLocalAudioProtocol() {
  protocol.handle('local-audio', async request => {
    try {
      return await createLocalAudioResponse(request)
    } catch {
      return new Response(null, { status: 400 })
    }
  })
}
