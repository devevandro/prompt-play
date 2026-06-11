import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

export function checkStreamUrl(
  url: string,
  redirectCount = 0
): Promise<boolean> {
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
