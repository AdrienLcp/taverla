import { normalizeAnswer } from '../round/answer-matching'

/**
 * How a catalogue says an album holds a film's music, in both the languages
 * this one is served in. Finding one of these is the **whole** of the rule: an
 * album that does not say so is not treated as a film's, because a composer's
 * top holds their concert recordings, their compilations and their own records
 * beside their scores.
 *
 * That costs real films — `Lawrence of Arabia` and `Chicken Run` are filed
 * under nothing but their own name and are lost here. It is the right side to
 * lose on: `ask the river`, `Camino` and `Overdrive` are filed the same way and
 * are nobody's film, and a round that asks for a film the album never named is
 * a round no player can win.
 */
const SOUNDTRACK_MARKER =
  /soundtrack|\bscore\b|\bost\b|motion\s+picture|music\s+from|complete\s+recordings|bande\s+originale|bande\s+sonore|musique\s+originale|original\s+(?:series|television)/iu

/**
 * A cue that names its own film, which is how a catalogue files a track lifted
 * out of a score and put on a concert album or an anthology: `Main Theme (From
 * "Schindler's List")` sits on `John Williams: The Great Movie Soundtracks`.
 * Read before the album for exactly that reason — there, the album names the
 * compilation and only the cue names the film.
 *
 * A lone apostrophe is not a closing quote, or `Schindler's List` would end at
 * `Schindler`. Two of them are: `''` is how the catalogue writes `"`.
 */
const FILM_IN_QUOTES =
  /(?:from|de|du|extrait\s+de|tiré\s+de)\s+(?:the\s+|le\s+|la\s+|les\s+|l')?(?:film|movie|série|series|serie)?\s*(?:["“”«»]|'')\s*([^"“”«»]{2,}?)\s*(?:["“”«»]|'')/iu

/**
 * The words that belong to the marker rather than to the film, dropped one at a
 * time from the right of whatever precedes it. `Legends Of The Fall Original
 * Motion Picture Soundtrack` offers no bracket and no dash to cut at, so the
 * cut is made at the marker itself — and stopping there would weld `Original`
 * onto the end of the film.
 */
const MARKER_WORDS = new Set([
  'a',
  'album',
  'amazon',
  'an',
  'and',
  'apple',
  'bande',
  'by',
  'cinematic',
  'complete',
  'de',
  'deluxe',
  'du',
  'edition',
  'expanded',
  'film',
  'from',
  'game',
  'hbo',
  'inspired',
  'la',
  'le',
  'les',
  'motion',
  'movie',
  'music',
  'musique',
  'netflix',
  'original',
  'originale',
  'ost',
  'picture',
  'recordings',
  'remastered',
  'score',
  'serie',
  'series',
  'sonore',
  'soundtrack',
  'television',
  'the',
  'video',
  'videogame'
])

/**
 * A compilation says so in its own title, and the film it would hand back is
 * whichever one the run of tracks happens to have come from — which is not one
 * film. `100 Greatest Western Themes` and `Francis Lai: The Essential Film
 * Music Collection` are the shape.
 */
const COMPILATION =
  /greatest|essential|collection|anthology|best\s+of|\bhits\b|unforgettable|\bthemes\b|\bworks\b|the\s+music\s+of|\bmedley\b/iu

/**
 * A season or a volume is not a different work. A room says *Outlander*, never
 * *Outlander: Season 1, Vol. 2*, and a series that ran seven of them would
 * otherwise be seven answers nobody gives.
 */
const SEASON_TAIL =
  /\s*[,:–—-]?\s*(?:season|saison|vol\.?|volume|series|part)\s+[\p{L}\p{N}]+.*$/iu

/** The same, for what a re-release adds: an edition is not a work either. */
const EDITION_TAIL =
  /\s*[,:–—-]?\s*(?:complete\s+recordings|expanded|deluxe|remastered|anniversary|limited)\b.*$/iu

const BRACKETED = /[([][^)\]]*[)\]]/gu

const TRAILING_WORD = /\s*\b([\p{L}\p{N}]+)\s*$/u

const CATALOGUE_SYMBOLS = /[®™]/gu

const LEADING_PUNCTUATION = /^[\s,:;.\-–—)\]]+/u

const TRAILING_PUNCTUATION = /[\s,:;.\-–—([]+$/u

const SHORTEST_FILM = 2

/**
 * A number can be the whole of a film's name — *1883*, *1917*, *300* — but two
 * digits left over from a season or a track number is not one.
 */
const SHORTEST_NUMERIC_FILM = 3

type CatalogueRelease = {
  /** The album the catalogue filed the track under, where a soundtrack names its film. */
  albumTitle: string
  /** Who the catalogue credits — the composer on a score, the singer on a soundtrack's songs. */
  artist: string
  /** The cue's own title, which sometimes carries the film where the album does not. */
  trackTitle: string
}

/**
 * The film a catalogue release names, or `null` where it names none — which is
 * this source's admission price, because the film is the half the round asks
 * for. A score cue's own title is `Cornfield Chase`, `Day One`, `Concerning
 * Hobbits`: the one thing at the table nobody can produce.
 *
 * A series is filed under the same word and on purpose. A composer who scores
 * one does the same job under the same name, and *Game of Thrones* is a thing a
 * table shouts exactly the way it shouts *Interstellar*.
 */
export const filmNamedBy = ({
  albumTitle,
  artist,
  trackTitle
}: CatalogueRelease): string | null => {
  for (const line of [trackTitle, albumTitle]) {
    const quoted = FILM_IN_QUOTES.exec(line.replace(CATALOGUE_SYMBOLS, ''))
    const named = quoted === null ? null : tidy(quoted[1] ?? '')

    if (named !== null && isNameable(named, artist)) {
      return named
    }
  }

  const album = albumTitle.replace(CATALOGUE_SYMBOLS, '')
  const marker = SOUNDTRACK_MARKER.exec(album)

  if (marker === null) {
    return null
  }

  const named = tidy(withoutMarkerWords(album.slice(0, marker.index)))

  return isNameable(named, artist) ? named : null
}

/**
 * Whether the catalogue credits this track to one of the composers the source
 * asked for.
 *
 * It is the seam where the room's definition is enforced: *a film's music is a
 * piece a film composer wrote for the film*, and a composer's top is not all
 * score. Deezer credits the performing artist on a soundtrack's songs, so
 * *My Heart Will Go On* surfaces under Céline Dion in James Horner's top and
 * *Suis-moi* under Camille in Hans Zimmer's. Both are films and neither is a
 * score, and letting them in would make the category a label the room catches
 * out on its second round.
 *
 * `includes` rather than equality, because a cue two composers share is
 * credited to both.
 */
export const isScoredByOneOf = ({
  artist,
  composers
}: {
  artist: string
  composers: readonly string[]
}): boolean => {
  const credited = normalizeAnswer(artist)

  return composers.some((composer) =>
    credited.includes(normalizeAnswer(composer))
  )
}

const withoutMarkerWords = (beforeMarker: string): string => {
  let kept = beforeMarker

  for (;;) {
    const trailing = TRAILING_WORD.exec(kept)

    if (
      trailing === null ||
      !MARKER_WORDS.has(trailing[1]?.toLowerCase() ?? '')
    ) {
      return kept
    }

    kept = kept.slice(0, trailing.index)
  }
}

const tidy = (candidate: string): string =>
  candidate
    .replace(BRACKETED, ' ')
    .replace(SEASON_TAIL, '')
    .replace(EDITION_TAIL, '')
    .replace(LEADING_PUNCTUATION, '')
    .replace(TRAILING_PUNCTUATION, '')
    .replace(/\s{2,}/gu, ' ')
    .trim()

/**
 * The last guard, and the one that catches what the marker let through: an
 * album named after its own composer hands back the composer as the film, which
 * is how `John Williams: The Great Movie Soundtracks` becomes `John Williams`.
 */
const isNameable = (named: string, artist: string): boolean => {
  if (
    named.length < SHORTEST_FILM ||
    COMPILATION.test(named) ||
    SOUNDTRACK_MARKER.test(named)
  ) {
    return false
  }

  if (!/\p{L}/u.test(named) && named.length < SHORTEST_NUMERIC_FILM) {
    return false
  }

  const folded = normalizeAnswer(named)
  const credited = normalizeAnswer(artist)

  return (
    folded.length >= SHORTEST_FILM &&
    !folded.startsWith(credited) &&
    !credited.startsWith(folded)
  )
}
