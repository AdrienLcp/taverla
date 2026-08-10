import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RoomSettings } from '@taverla/protocol/room'

import {
  errorsIn,
  FAST_GAME,
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

const CHOICE_GAME: RoomSettings = { ...FAST_GAME, answerMode: 'choice' }
const TYPED_GAME: RoomSettings = { ...FAST_GAME, answerMode: 'typed' }

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

  it('[choice] hands every phone the same candidates and never which is right', async () => {
    const { host, zoe } = await roundInPlay(CHOICE_GAME)

    const choices = playerView(zoe)?.round?.choices ?? []

    expect(choices.length).toBeGreaterThan(1)

    // Over the whole transcript, not just the latest view: a leak in any frame
    // of the round is a leak.
    const everythingZoeWasSent = zoe.frames.map(({ raw }) => raw).join('')

    expect(everythingZoeWasSent).not.toContain('correctChoiceIndex')
    expect(hostView(host)?.currentTrack?.title).toBeDefined()
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

  it('[choice] refuses a second answer from the same phone', async () => {
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

  it('[choice] refuses a buzz, whatever the phone sends by hand', async () => {
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
    const choices = playerView(zoe)?.round?.choices ?? []
    const right = choices.findIndex(
      (choice) => choice.title === hostView(host)?.currentTrack?.title
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

    // One for the pick and two for being first, against five for typing it.
    expect(scores.get('Zoe')).toBe(3)
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
    expect(hostView(host)?.currentAudioUrl).toBeTruthy()
    expect(hostView(host)?.currentTrack).toBeNull()

    const seated = hostView(host)?.players.map((player) => player.nickname)

    expect(seated).toContain('Adrien')
  })

  it('[seat] answers from the host seat like any other phone', async () => {
    const { host } = await harness.openRoom(TYPED_GAME, 'Adrien')

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the clip to start'
    )

    host.send({
      answer: { artist: '', kind: 'typed', title: 'a guess' },
      roundId: hostView(host)?.round?.id ?? '',
      type: 'player.answer'
    })

    // One seated player, so their answer is the last one and closes the round.
    await waitFor(
      () => hostView(host)?.phase === 'revealed',
      'the round to close on the host’s own answer'
    )

    expect(
      hostView(host)?.round?.revealedAnswers.map((answer) => answer.said)
    ).toEqual(['a guess'])
  })

  it('[typed] scores the halves, the pair and the speed', async () => {
    const { host, max, zoe } = await roundInPlay(TYPED_GAME)

    const roundId = playerView(zoe)?.round?.id ?? ''
    const track = hostView(host)?.currentTrack

    if (track === undefined || track === null) {
      throw new Error('the host should hold the track')
    }

    // Zoe has the whole thing and gets there first; Max has only the artist.
    zoe.send({
      answer: { artist: track.artist, kind: 'typed', title: track.title },
      roundId,
      type: 'player.answer'
    })

    await waitFor(
      () => (playerView(max)?.round?.answers.length ?? 0) === 1,
      'Zoe to be in'
    )

    max.send({
      answer: { artist: track.artist, kind: 'typed', title: 'nothing like it' },
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

    // Title + artist + the pair bonus, and +2 for being the first correct one.
    expect(scores.get('Zoe')).toBe(5)
    // The artist alone, and +1 for being the second correct answer.
    expect(scores.get('Max')).toBe(2)
  })

  it('[typed] forgives what the room actually types', async () => {
    const { host, max, zoe } = await roundInPlay(TYPED_GAME)

    const roundId = playerView(zoe)?.round?.id ?? ''
    const track = hostView(host)?.currentTrack

    if (track === undefined || track === null) {
      throw new Error('the host should hold the track')
    }

    zoe.send({
      answer: {
        artist: track.artist.toLowerCase().replace(/\s/g, ''),
        kind: 'typed',
        title: track.title.toLowerCase()
      },
      roundId,
      type: 'player.answer'
    })
    max.send({
      answer: { artist: '', kind: 'typed', title: '' },
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

    expect(scores.get('Zoe')).toBe(5)
    expect(scores.get('Max')).toBe(0)
  })

  it('[typed] shows what everyone said, only once the answer is out', async () => {
    const { host, max, zoe } = await roundInPlay(TYPED_GAME)

    const roundId = playerView(zoe)?.round?.id ?? ''
    const track = hostView(host)?.currentTrack

    if (track === undefined || track === null) {
      throw new Error('the host should hold the track')
    }

    zoe.send({
      answer: { artist: '', kind: 'typed', title: 'a wild guess' },
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

    max.send({
      answer: { artist: track.artist, kind: 'typed', title: track.title },
      roundId,
      type: 'player.answer'
    })

    await waitFor(
      () => (playerView(max)?.round?.revealedAnswers.length ?? 0) === 2,
      'the answers to be published'
    )

    expect(
      playerView(max)?.round?.revealedAnswers.map((answer) => answer.said)
    ).toContain('a wild guess')
  })
})
