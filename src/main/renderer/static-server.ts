import { createReadStream, statSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { extname, join, normalize, relative } from 'node:path'

let rendererServer: Server | null = null
let rendererServerUrl = ''

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function resolveRendererFile(rootPath: string, requestUrl: string): string {
  const pathname = new URL(requestUrl, 'http://127.0.0.1').pathname
  const decodedPath = decodeURIComponent(pathname)
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath
  const filePath = normalize(join(rootPath, requestedPath))
  const relativePath = relative(rootPath, filePath)

  if (relativePath.startsWith('..') || relativePath === '') {
    return join(rootPath, 'index.html')
  }

  return filePath
}

export async function startRendererStaticServer(rootPath: string) {
  if (rendererServerUrl) {
    return rendererServerUrl
  }

  rendererServer = createServer((request, response) => {
    const filePath = resolveRendererFile(rootPath, request.url ?? '/')

    try {
      const fileStat = statSync(filePath)

      if (!fileStat.isFile()) {
        response.writeHead(404)
        response.end()
        return
      }

      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Length': fileStat.size,
        'Content-Type':
          MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
      })
      createReadStream(filePath).pipe(response)
    } catch {
      response.writeHead(404)
      response.end()
    }
  })

  await new Promise<void>((resolve, reject) => {
    rendererServer?.once('error', reject)
    rendererServer?.listen(0, '127.0.0.1', () => resolve())
  })

  const address = rendererServer.address()

  if (!address || typeof address === 'string') {
    throw new Error('Renderer static server did not bind to a TCP port')
  }

  rendererServerUrl = `http://127.0.0.1:${address.port}`

  return rendererServerUrl
}

export function getRendererStaticServerUrl() {
  return rendererServerUrl
}

export function stopRendererStaticServer() {
  rendererServer?.close()
  rendererServer = null
  rendererServerUrl = ''
}
