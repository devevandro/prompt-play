function cleanLine(line: string) {
  return line.trim().replace(/^\uFEFF/, '')
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function resolveUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

function getPlaylistUrl(contents: string, baseUrl: string) {
  const lines = contents
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)

  for (const line of lines) {
    if (line.startsWith('#') || /^\[playlist\]$/i.test(line)) {
      continue
    }

    const plsMatch = /^File\d+=(.+)$/i.exec(line)
    const asxMatch = /<ref\s+href=["']([^"']+)["']/i.exec(line)
    const candidate = plsMatch?.[1] ?? asxMatch?.[1] ?? line
    const url = resolveUrl(candidate.trim(), baseUrl)

    if (url && isHttpUrl(url)) {
      return url
    }
  }

  return null
}

function isPlaylistResponse(response: Response, url: string) {
  const contentType = response.headers.get('content-type') ?? ''

  return (
    /mpegurl|x-mpegurl|scpls|x-scpls|pls|asx|xml|text\/plain/i.test(
      contentType
    ) || /\.(m3u8?|pls|asx)(?:$|[?#])/i.test(url)
  )
}

export async function resolveRadioStreamUrl(url: string): Promise<string> {
  if (!isHttpUrl(url)) {
    return url
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    const response = await fetch(url, {
      headers: {
        'Icy-MetaData': '1',
        'User-Agent': 'PromptPlay/0.0',
      },
      redirect: 'follow',
      signal: controller.signal,
    })

    if (!response.ok) {
      return response.url || url
    }

    if (!isPlaylistResponse(response, response.url || url)) {
      response.body?.cancel().catch(() => {})
      return response.url || url
    }

    const contents = await response.text()

    return getPlaylistUrl(contents, response.url || url) ?? response.url ?? url
  } catch {
    return url
  } finally {
    clearTimeout(timeout)
  }
}
