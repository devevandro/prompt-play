import type { Dirent } from 'node:fs'
import { open, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, extname, isAbsolute, join, resolve } from 'node:path'

import type { MusicLibrary, PlayerQueueItem } from 'shared/types'

const AUDIO_EXTENSIONS = new Set([
  '.aac',
  '.flac',
  '.m4a',
  '.mp3',
  '.ogg',
  '.opus',
  '.wav',
])

interface AudioFileMetadata {
  album?: string
  artist?: string
  duration: number | null
  title?: string
}

const MPEG_BITRATES: Record<number, Record<number, number[]>> = {
  1: {
    1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  },
  2: {
    1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  },
}

async function canReadDirectory(folderPath: string): Promise<boolean> {
  try {
    await readdir(folderPath, { withFileTypes: true })

    return true
  } catch {
    return false
  }
}

async function resolveMusicFolderPath(inputPath: string): Promise<string> {
  const trimmedPath = inputPath.trim().replace(/^["']|["']$/g, '')

  if (!trimmedPath) {
    throw new Error('Empty music folder path')
  }

  const homePath = homedir()
  const candidates = trimmedPath.startsWith('~/')
    ? [join(homePath, trimmedPath.slice(2))]
    : isAbsolute(trimmedPath)
      ? [trimmedPath]
      : [
          resolve(trimmedPath),
          join(homePath, trimmedPath),
          join(homePath, 'Music', trimmedPath),
          join(homePath, 'Downloads', trimmedPath),
        ]

  for (const candidate of candidates) {
    if (await canReadDirectory(candidate)) {
      return candidate
    }
  }

  throw new Error(`Music folder not found: ${trimmedPath}`)
}

function readSynchsafeInt(buffer: Buffer, offset: number): number {
  return (
    (buffer[offset] << 21) |
    (buffer[offset + 1] << 14) |
    (buffer[offset + 2] << 7) |
    buffer[offset + 3]
  )
}

function decodeId3TextFrame(frame: Buffer): string | undefined {
  if (frame.length <= 1) {
    return undefined
  }

  const encoding = frame[0]
  const content = frame.subarray(1)
  const value =
    encoding === 1 || encoding === 2
      ? content.toString('utf16le')
      : content.toString('utf8')

  return value.replace(/\0/g, '').trim() || undefined
}

function readId3Tags(buffer: Buffer): Partial<AudioFileMetadata> {
  if (buffer.subarray(0, 3).toString('latin1') !== 'ID3') {
    return {}
  }

  const tags: Partial<AudioFileMetadata> = {}
  const majorVersion = buffer[3]
  const tagSize = readSynchsafeInt(buffer, 6)
  let offset = 10
  const end = Math.min(buffer.length, offset + tagSize)

  while (offset + 10 <= end) {
    const frameId = buffer.subarray(offset, offset + 4).toString('latin1')
    const frameSize =
      majorVersion === 4
        ? readSynchsafeInt(buffer, offset + 4)
        : buffer.readUInt32BE(offset + 4)

    if (!frameId.trim() || frameSize <= 0) {
      break
    }

    const frame = buffer.subarray(offset + 10, offset + 10 + frameSize)
    const value = decodeId3TextFrame(frame)

    if (frameId === 'TIT2') {
      tags.title = value
    } else if (frameId === 'TPE1' || frameId === 'TPE2') {
      tags.artist = tags.artist ?? value
    } else if (frameId === 'TALB') {
      tags.album = value
    }

    offset += 10 + frameSize
  }

  return tags
}

function findMpegHeader(buffer: Buffer): number {
  const id3Size =
    buffer.subarray(0, 3).toString('latin1') === 'ID3'
      ? readSynchsafeInt(buffer, 6) + 10
      : 0

  for (let offset = id3Size; offset + 4 < buffer.length; offset += 1) {
    if (buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
      return offset
    }
  }

  return -1
}

function readMp3Duration(fileSize: number, buffer: Buffer): number | null {
  const headerOffset = findMpegHeader(buffer)

  if (headerOffset === -1) {
    return null
  }

  const header = buffer.readUInt32BE(headerOffset)
  const versionBits = (header >> 19) & 0x3
  const layerBits = (header >> 17) & 0x3
  const bitrateIndex = (header >> 12) & 0xf

  if (
    versionBits === 1 ||
    layerBits === 0 ||
    bitrateIndex === 0 ||
    bitrateIndex === 15
  ) {
    return null
  }

  const version = versionBits === 3 ? 1 : 2
  const layer = 4 - layerBits
  const bitrate = MPEG_BITRATES[version]?.[layer]?.[bitrateIndex]

  if (!bitrate) {
    return null
  }

  const audioBytes = Math.max(0, fileSize - headerOffset)
  const seconds = Math.round(audioBytes / ((bitrate * 1000) / 8))

  return seconds > 0 ? seconds : null
}

async function readAudioFileMetadata(
  filePath: string,
  fileSize: number
): Promise<AudioFileMetadata> {
  if (extname(filePath).toLowerCase() !== '.mp3') {
    return { duration: null }
  }

  const fileHandle = await open(filePath, 'r')

  try {
    const buffer = Buffer.alloc(Math.min(fileSize, 256 * 1024))
    const result = await fileHandle.read(buffer, 0, buffer.length, 0)
    const fileBuffer = buffer.subarray(0, result.bytesRead)

    return {
      ...readId3Tags(fileBuffer),
      duration: readMp3Duration(fileSize, fileBuffer),
    }
  } finally {
    await fileHandle.close()
  }
}

export async function scanMusicFolder(
  folderPath: string
): Promise<MusicLibrary> {
  const items: PlayerQueueItem[] = []
  const resolvedFolderPath = await resolveMusicFolderPath(folderPath)

  async function walk(currentPath: string) {
    let entries: Dirent[]

    try {
      entries = await readdir(currentPath, { withFileTypes: true })
    } catch (error) {
      if (currentPath === resolvedFolderPath) {
        throw error
      }

      return
    }

    for (const entry of entries) {
      const entryPath = join(currentPath, entry.name)

      if (entry.isDirectory()) {
        await walk(entryPath)
        continue
      }

      if (
        !entry.isFile() ||
        !AUDIO_EXTENSIONS.has(extname(entry.name).toLowerCase())
      ) {
        continue
      }

      const fileStats = await stat(entryPath)
      const metadata = await readAudioFileMetadata(
        entryPath,
        fileStats.size
      ).catch<AudioFileMetadata>(() => ({ duration: null }))

      items.push({
        id: `music-${Buffer.from(entryPath).toString('base64url')}`,
        mode: 'local',
        title: metadata.title ?? entry.name,
        artist: metadata.artist ?? basename(currentPath),
        album: metadata.album ?? currentPath,
        duration: metadata.duration,
        sourceDetail: '-rw-r--r--',
        src: entryPath,
        details: [
          { label: 'folder', value: basename(currentPath) },
          { label: 'path', value: entryPath },
        ],
      })
    }
  }

  await walk(resolvedFolderPath)

  return {
    id: `library-${Buffer.from(resolvedFolderPath).toString('base64url')}`,
    name: basename(resolvedFolderPath),
    path: resolvedFolderPath,
    musicCount: items.length,
    items,
  }
}
