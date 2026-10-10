import { readFileSync } from 'node:fs'
import { crc32 } from 'node:zlib'

import { describe, expect, it } from 'vitest'

const INDEX_HTML = readFileSync(
  new URL('../../../index.html', import.meta.url),
  'utf8'
)

const SHARE_IMAGE = readFileSync(
  new URL('../../../public/og.png', import.meta.url)
)

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
])

type PngChunk = {
  type: string
  data: Buffer
  storedCrc: number
  computedCrc: number
}

const readChunks = (png: Buffer): PngChunk[] => {
  const chunks: PngChunk[] = []
  let offset = PNG_SIGNATURE.length
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const typeAndData = png.subarray(offset + 4, offset + 8 + length)
    chunks.push({
      computedCrc: crc32(typeAndData),
      data: typeAndData.subarray(4),
      storedCrc: png.readUInt32BE(offset + 8 + length),
      type: typeAndData.subarray(0, 4).toString('latin1')
    })
    offset += 12 + length
  }
  return chunks
}

const readMetaNumber = (property: string): number => {
  const match = INDEX_HTML.match(
    new RegExp(`content="(\\d+)" property="${property}"`)
  )
  return Number(match?.[1])
}

describe('share image', () => {
  it('[share-image] opens with the PNG signature, its line-ending bytes intact', () => {
    expect(SHARE_IMAGE.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE)
  })

  it('[share-image] every chunk matches its checksum, through to IEND', () => {
    const chunks = readChunks(SHARE_IMAGE)
    expect(
      chunks
        .filter((chunk) => chunk.storedCrc !== chunk.computedCrc)
        .map((chunk) => chunk.type)
    ).toEqual([])
    expect(chunks.at(-1)?.type).toBe('IEND')
  })

  it('[share-image] is the size its og:image:width and og:image:height announce', () => {
    const header = readChunks(SHARE_IMAGE)[0]
    expect(header?.type).toBe('IHDR')
    expect({
      height: header?.data.readUInt32BE(4),
      width: header?.data.readUInt32BE(0)
    }).toEqual({
      height: readMetaNumber('og:image:height'),
      width: readMetaNumber('og:image:width')
    })
  })
})
