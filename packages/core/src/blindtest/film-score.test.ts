import { describe, expect, it } from 'vitest'

import { filmNamedBy, isScoredByOneOf } from './film-score'

const release = ({
  albumTitle,
  artist = 'Hans Zimmer',
  trackTitle = 'Cue'
}: {
  albumTitle: string
  artist?: string
  trackTitle?: string
}) => filmNamedBy({ albumTitle, artist, trackTitle })

describe('filmNamedBy', () => {
  it('[film] names the film an album says it holds the music of', () => {
    expect(
      release({
        albumTitle: 'Interstellar (Original Motion Picture Soundtrack)'
      })
    ).toBe('Interstellar')

    expect(
      release({ albumTitle: 'Zootopie 2 (Bande Originale du Film)' })
    ).toBe('Zootopie 2')

    expect(
      release({
        albumTitle:
          'Peau d’âne (Bande sonore originale du film de Jacques Demy)'
      })
    ).toBe('Peau d’âne')
  })

  it('[film] cuts at a colon, a dash or the marker itself', () => {
    expect(
      release({ albumTitle: 'The Last Samurai: Original Motion Picture Score' })
    ).toBe('The Last Samurai')

    expect(
      release({
        albumTitle: 'Dances With Wolves - Original Motion Picture Soundtrack'
      })
    ).toBe('Dances With Wolves')

    // Nothing to cut at, so the cut is made at the marker — and `Original`
    // belongs to the marker, not to the film.
    expect(
      release({
        albumTitle: 'Legends Of The Fall Original Motion Picture Soundtrack'
      })
    ).toBe('Legends Of The Fall')
  })

  it('[film] keeps a colon the film itself carries', () => {
    expect(
      release({
        albumTitle: 'Spider-Man: Across the Spider-Verse (Original Score)'
      })
    ).toBe('Spider-Man: Across the Spider-Verse')

    expect(
      release({
        albumTitle:
          "Pirates Of The Caribbean: At World's End Original Soundtrack"
      })
    ).toBe("Pirates Of The Caribbean: At World's End")
  })

  it('[film] reads the cue when the album names a compilation', () => {
    expect(
      release({
        albumTitle: 'John Williams: The Great Movie Soundtracks',
        artist: 'John Williams',
        trackTitle: "Main Theme (From ''Schindler's List'')"
      })
    ).toBe("Schindler's List")
  })

  it('[film] drops the season and the volume a series is split into', () => {
    expect(
      release({
        albumTitle:
          'Outlander: Season 1, Vol. 1 (Original Television Soundtrack)',
        artist: 'Bear McCreary'
      })
    ).toBe('Outlander')

    expect(
      release({
        albumTitle: 'Euphoria: Season 3 (HBO Original Series Soundtrack)',
        artist: 'Labrinth'
      })
    ).toBe('Euphoria')
  })

  it('[film] keeps a film whose whole name is a number', () => {
    expect(
      release({
        albumTitle: '1883: Season 1, Vol. 1 (Original Series Soundtrack)',
        artist: 'Brian Tyler'
      })
    ).toBe('1883')
  })

  it('[film] refuses an album that never says it holds a film’s music', () => {
    expect(release({ albumTitle: 'Rocky IV' })).toBeNull()
    expect(
      release({ albumTitle: "40 Chansons D'or", artist: 'Vladimir Cosma' })
    ).toBeNull()
    expect(
      release({ albumTitle: 'ask the river', artist: 'Jóhann Jóhannsson' })
    ).toBeNull()
  })

  it('[film] refuses a compilation, whichever end it says so at', () => {
    expect(
      release({
        albumTitle: '100 Greatest Western Themes',
        artist: 'Ennio Morricone'
      })
    ).toBeNull()

    expect(
      release({
        albumTitle: 'Music from the Twilight Saga',
        artist: 'Carter Burwell'
      })
    ).toBeNull()

    expect(
      release({
        albumTitle: '50 unforgettable soundtracks, vol. 20/50',
        artist: 'Francis Lai'
      })
    ).toBeNull()
  })

  it('[film] refuses an album named after the composer', () => {
    expect(
      release({
        albumTitle: 'John Williams: The Great Movie Soundtracks',
        artist: 'John Williams'
      })
    ).toBeNull()
  })
})

describe('isScoredByOneOf', () => {
  const composers = [
    'Hans Zimmer',
    'James Horner',
    'Kyle Dixon & Michael Stein'
  ]

  it('[film] takes what the credited composer wrote', () => {
    expect(isScoredByOneOf({ artist: 'Hans Zimmer', composers })).toBe(true)
  })

  it('[film] takes a cue two names share', () => {
    expect(
      isScoredByOneOf({ artist: 'Hans Zimmer, Lorne Balfe', composers })
    ).toBe(true)

    expect(
      isScoredByOneOf({ artist: 'Kyle Dixon & Michael Stein', composers })
    ).toBe(true)
  })

  // The seam the definition is enforced at: a film, and not a film's score.
  it('[film] refuses the singer a soundtrack credits its songs to', () => {
    expect(isScoredByOneOf({ artist: 'Céline Dion', composers })).toBe(false)
    expect(isScoredByOneOf({ artist: 'Camille', composers })).toBe(false)
  })
})
