import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_MODE_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'

import {
  bankedHalves,
  basePointsFor,
  blindtestRound,
  errorsIn,
  FAST_GAME,
  halves,
  hostContent,
  hostView,
  playerView,
  type RoomHarness,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

const CHOICE_GAME: RoomSettings = {
  ...FAST_GAME,
  mode: DEFAULT_MODE_SETTINGS.choice
}
const TYPED_GAME: RoomSettings = {
  ...FAST_GAME,
  mode: DEFAULT_MODE_SETTINGS.typed
}

describe('answering all at once', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  const roundInPlay = async (settings: RoomSettings) => {
    const { code, host } = await harness.openRoom(settings)
    const zoe = await harness.seat({ code, nickname: 'Zoe' })
    const max = await harness.seat({ code, nickname: 'Max' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(zoe)?.phase === 'playing',
      'the clip to start'
    )

    return { code, host, max, zoe }
  }

  /**
   * One player in the room, so it is that player finishing that closes the
   * round rather than the clip running out. A second seat nobody answers from
   * costs every assertion the full clip.
   */
  const soloRoundInPlay = async (settings: RoomSettings) => {
    const { code, host } = await harness.openRoom(settings)
    const zoe = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(zoe)?.phase === 'playing',
      'the clip to start'
    )

    return { code, host, zoe }
  }

  it('[choice] hands every player the same candidates and never which is right', async () => {
    const { host, zoe } = await roundInPlay(CHOICE_GAME)

    const choices = blindtestRound(playerView(zoe))?.choices ?? []

    expect(choices.length).toBeGreaterThan(1)

    // Over the whole transcript, not just the latest view: a leak in any frame
    // of the round is a leak.
    const everythingZoeWasSent = zoe.frames.map(({ raw }) => raw).join('')

    expect(everythingZoeWasSent).not.toContain('correctChoiceIndex')
    expect(hostContent(host)?.track?.title).toBeDefined()
  })

  it('[choice] ends the round when the last player has answered', async () => {
    const { max, zoe } = await roundInPlay(CHOICE_GAME)

    const roundId = playerView(zoe)?.round?.id ?? ''

    zoe.send({
      answer: { choiceIndex: 0, kind: 'choice' },
      roundId,
      type: 'player.answer'
    })

    await waitFor(
      () => (playerView(max)?.round?.answers.length ?? 0) === 1,
      'the room to see Zoe answer'
    )

    // Still playing: one answer does not take the floor the way a buzz does.
    expect(playerView(max)?.phase).toBe('playing')

    max.send({
      answer: { choiceIndex: 0, kind: 'choice' },
      roundId,
      type: 'player.answer'
    })

    await waitFor(
      () => playerView(zoe)?.phase === 'revealed',
      'the round to close itself'
    )
  })

  it('[choice] refuses a second answer from the same player', async () => {
    const { zoe } = await roundInPlay(CHOICE_GAME)

    const roundId = playerView(zoe)?.round?.id ?? ''
    const answer = {
      answer: { choiceIndex: 0, kind: 'choice' as const },
      roundId,
      type: 'player.answer' as const
    }

    zoe.send(answer)
    zoe.send(answer)

    await waitFor(() => errorsIn(zoe).length > 0, 'the refusal')
    expect(errorsIn(zoe)[0]).toMatchObject({ code: 'already_buzzed' })
  })

  it('[choice] refuses a buzz, whatever the client sends by hand', async () => {
    const { zoe } = await roundInPlay(CHOICE_GAME)

    zoe.send({
      roundId: playerView(zoe)?.round?.id ?? '',
      type: 'player.buzz'
    })

    await waitFor(() => errorsIn(zoe).length > 0, 'the refusal')
    expect(errorsIn(zoe)[0]).toMatchObject({ code: 'wrong_phase' })
  })

  it('[choice] pays a right pick less than typing the whole thing', async () => {
    const { host, max, zoe } = await roundInPlay(CHOICE_GAME)

    const roundId = playerView(zoe)?.round?.id ?? ''
    const choices = blindtestRound(playerView(zoe))?.choices ?? []
    const right = choices.findIndex(
      (choice) => choice.title === hostContent(host)?.track?.title
    )

    zoe.send({
      answer: { choiceIndex: right, kind: 'choice' },
      roundId,
      type: 'player.answer'
    })
    max.send({
      answer: { choiceIndex: (right + 1) % choices.length, kind: 'choice' },
      roundId,
      type: 'player.answer'
    })

    await waitFor(
      () => playerView(zoe)?.phase === 'revealed',
      'the round to close'
    )

    const scores = new Map(
      (playerView(zoe)?.players ?? []).map((player) => [
        player.nickname,
        player.score
      ])
    )

    // One for the pick, against three for typing the pair. What the clock adds
    // is the same in both modes and is taken back off to say so.
    expect(
      basePointsFor({
        playerId: playerView(zoe)?.youId ?? null,
        view: playerView(zoe)
      })
    ).toBe(1)
    expect(scores.get('Zoe')).toBeGreaterThanOrEqual(1)
    expect(scores.get('Max')).toBe(0)
  })

  it('[seat] lets a host play, and stops telling them the answer', async () => {
    const { code, host } = await harness.openRoom(TYPED_GAME, 'Adrien')
    const zoe = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(zoe)?.phase === 'playing',
      'the clip to start'
    )

    // The speaker still gets what it needs, and the judge's copy is gone.
    expect(hostContent(host)?.audioUrl).toBeTruthy()
    expect(hostContent(host)?.track).toBeNull()

    const seated = hostView(host)?.players.map((player) => player.nickname)

    expect(seated).toContain('Adrien')
    // The id of that seat, which is how this screen recognises its own answer
    // in a round it is also running.
    expect(hostView(host)?.youId).not.toBeNull()
  })

  /**
   * The mirror of the test above, on the one socket that outlives its own seat:
   * a player leaving closes theirs, where a host carries on judging. The
   * console does reopen the socket without the nickname, and that is what must
   * not be what restores the answer — a host who gave the seat back mid-round
   * would otherwise judge the next buzz blind.
   */
  it('[seat] tells a host the answer again once they give the seat back', async () => {
    const { code, host } = await harness.openRoom(TYPED_GAME, 'Adrien')
    const zoe = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(zoe)?.phase === 'playing',
      'the clip to start'
    )

    expect(hostContent(host)?.track).toBeNull()

    host.send({ type: 'player.leave' })
    await waitFor(
      () => hostContent(host)?.track != null,
      'the judge to be told the answer again'
    )

    expect(hostView(host)?.players.map((player) => player.nickname)).toEqual([
      'Zoe'
    ])
    expect(hostView(host)?.youId).toBeNull()
  })

  it('[seat] answers from the host seat like any other player', async () => {
    const { host } = await harness.openRoom(TYPED_GAME, 'Adrien')

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the clip to start'
    )

    // The seat is why this screen cannot read the answer off its own view, so
    // the guess is a miss and the clip is what ends the round.
    expect(hostContent(host)?.track).toBeNull()

    const roundId = hostView(host)?.round?.id ?? ''

    host.send({
      answer: { guess: 'a guess', kind: 'typed' },
      roundId,
      type: 'player.answer'
    })
    await waitFor(
      () => (hostView(host)?.round?.answers.length ?? 0) === 1,
      'the guess to land'
    )

    // Nothing was banked, so nothing closes this round by itself — the host
    // calls it, which is the other way a simultaneous round ends.
    host.send({ roundId, type: 'host.reveal' })
    await waitFor(
      () => hostView(host)?.phase === 'revealed',
      'the host to close the round'
    )

    expect(
      hostView(host)?.round?.revealedAnswers.map((answer) => answer.said)
    ).toEqual(['a guess'])
  })

  it('[typed] banks one half at a time, and pays a shared instant the same', async () => {
    const { host, max, zoe } = await roundInPlay(TYPED_GAME)

    const roundId = playerView(zoe)?.round?.id ?? ''
    const track = hostContent(host)?.track

    if (track === undefined || track === null) {
      throw new Error('the host should hold the track')
    }

    const guess = (peer: typeof zoe, said: string) => {
      peer.send({
        answer: { guess: said, kind: 'typed' },
        roundId,
        type: 'player.answer'
      })
    }

    // Zoe banks the title first. Under the rank table that alone was worth a
    // point more than Max; the clock cannot tell two answers a few hundred
    // milliseconds apart from each other, and no longer pretends to.
    guess(zoe, track.title)
    await waitFor(
      () => bankedHalves(playerView(zoe))?.titleCorrect === true,
      'Zoe’s title to be banked'
    )

    guess(max, track.artist)
    await waitFor(
      () => bankedHalves(playerView(max))?.artistCorrect === true,
      'Max’s artist to be banked'
    )

    guess(zoe, track.artist)
    guess(max, track.title)

    await waitFor(
      () => playerView(zoe)?.phase === 'revealed',
      'the round to close once both hold the pair'
    )

    const scores = new Map(
      (playerView(zoe)?.players ?? []).map((player) => [
        player.nickname,
        player.score
      ])
    )

    // The pair pays 3 however it was reached, and both reached it inside the
    // same second of the same round.
    expect(
      basePointsFor({
        playerId: playerView(zoe)?.youId ?? null,
        view: playerView(zoe)
      })
    ).toBe(3)
    expect(scores.get('Zoe')).toBe(scores.get('Max'))
  })

  it('[typed] keeps a player in the round after a guess that lands nothing', async () => {
    const { host, zoe } = await soloRoundInPlay(TYPED_GAME)

    const roundId = playerView(zoe)?.round?.id ?? ''
    const track = hostContent(host)?.track

    if (track === undefined || track === null) {
      throw new Error('the host should hold the track')
    }

    zoe.send({
      answer: { guess: 'nothing like it', kind: 'typed' },
      roundId,
      type: 'player.answer'
    })
    await waitFor(
      () => (playerView(zoe)?.round?.answers.length ?? 0) === 1,
      'Zoe to be in'
    )

    expect(errorsIn(zoe)).toEqual([])
    expect(playerView(zoe)?.yourVerdict).toEqual(halves(false, false))

    zoe.send({
      answer: { guess: track.title, kind: 'typed' },
      roundId,
      type: 'player.answer'
    })

    await waitFor(
      () => bankedHalves(playerView(zoe))?.titleCorrect === true,
      'the second guess to be banked'
    )
  })

  it('[typed] refuses a guess from a player who already holds both halves', async () => {
    const { host, zoe } = await soloRoundInPlay(TYPED_GAME)

    const roundId = playerView(zoe)?.round?.id ?? ''
    const track = hostContent(host)?.track

    if (track === undefined || track === null) {
      throw new Error('the host should hold the track')
    }

    for (const said of [track.title, track.artist]) {
      zoe.send({
        answer: { guess: said, kind: 'typed' },
        roundId,
        type: 'player.answer'
      })
    }

    await waitFor(
      () => playerView(zoe)?.phase === 'revealed',
      'the round to close'
    )

    zoe.send({
      answer: { guess: 'one more for luck', kind: 'typed' },
      roundId,
      type: 'player.answer'
    })

    await waitFor(() => errorsIn(zoe).length > 0, 'the refusal')
  })

  it('[typed] forgives what the room actually types', async () => {
    const { host, zoe } = await soloRoundInPlay(TYPED_GAME)

    const roundId = playerView(zoe)?.round?.id ?? ''
    const track = hostContent(host)?.track

    if (track === undefined || track === null) {
      throw new Error('the host should hold the track')
    }

    zoe.send({
      answer: { guess: track.title.toLowerCase(), kind: 'typed' },
      roundId,
      type: 'player.answer'
    })
    zoe.send({
      answer: {
        guess: track.artist.toLowerCase().replace(/\s/g, ''),
        kind: 'typed'
      },
      roundId,
      type: 'player.answer'
    })

    await waitFor(
      () => playerView(zoe)?.phase === 'revealed',
      'the round to close'
    )

    expect(
      basePointsFor({
        playerId: playerView(zoe)?.youId ?? null,
        view: playerView(zoe)
      })
    ).toBe(3)
  })

  it('[typed] shows what everyone said, only once the answer is out', async () => {
    const { host, max, zoe } = await roundInPlay(TYPED_GAME)

    const roundId = playerView(zoe)?.round?.id ?? ''
    const track = hostContent(host)?.track

    if (track === undefined || track === null) {
      throw new Error('the host should hold the track')
    }

    zoe.send({
      answer: { guess: 'a wild guess', kind: 'typed' },
      roundId,
      type: 'player.answer'
    })

    await waitFor(
      () => (playerView(max)?.round?.answers.length ?? 0) === 1,
      'Zoe to be in'
    )

    expect(playerView(max)?.round?.revealedAnswers).toEqual([])
    expect(max.frames.map(({ raw }) => raw).join('')).not.toContain(
      'a wild guess'
    )

    for (const said of [track.title, track.artist]) {
      max.send({
        answer: { guess: said, kind: 'typed' },
        roundId,
        type: 'player.answer'
      })
    }

    // Zoe never lands anything, so she is not done and the round would run to
    // the end of the clip. The host calls it instead.
    await waitFor(
      () => bankedHalves(playerView(max))?.artistCorrect === true,
      'Max to hold the pair'
    )
    host.send({ roundId, type: 'host.reveal' })

    await waitFor(
      () => (playerView(max)?.round?.revealedAnswers.length ?? 0) === 2,
      'the answers to be published'
    )

    // Hers is the miss, kept because a name with nothing beside it reads as a
    // bug rather than as a player who tried.
    expect(
      playerView(max)?.round?.revealedAnswers.map((answer) => answer.said)
    ).toContain('a wild guess')
  })
})
