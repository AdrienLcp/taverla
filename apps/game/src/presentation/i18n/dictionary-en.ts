import { defineTranslation } from '@taverla/core/i18n/define-translation'
import { defineTranslations } from '@taverla/core/i18n/translator'

/**
 * The reference dictionary: its keys are the type every other locale is checked
 * against, so a string added here does not compile until every locale has it.
 *
 * A count declares `plural` here the moment *any* locale inflects around it,
 * even where English does not — the shape of a key is the same in every
 * dictionary, so English writing only `other` is what lets French write `one`.
 *
 * `blindtest.*`, `buzzer.*` and `quiz.*` are the namespaces a single game owns.
 * Everything else — joining a room, the roster, the buzzer *mode*, the field a
 * simultaneous round is answered in, the round counter, the connection, the
 * errors — is the shell that the next game reuses unchanged. See
 * `docs/game-catalogue.md`.
 */
export const EN_DICTIONARY = defineTranslations({
  blindtest: {
    answer: {
      anyOrder: 'The title, the artist, or both — as many goes as you like.',
      artistFound: 'Artist ✓',
      bothFound: 'You have both. Sit back.',
      titleFound: 'Title ✓'
    },
    clip: 'Clip length',
    difficulty: {
      label: 'How well known',
      mixed: 'Deep cuts too',
      obscure: 'For the experts',
      wellKnown: 'Crowd-pleasers'
    },
    genre: {
      '52': 'French songs',
      '106': 'Electro',
      '113': 'Dance',
      '116': 'Rap and hip hop',
      '129': 'Jazz',
      '132': 'Pop',
      '144': 'Reggae',
      '152': 'Rock',
      '165': 'R&B',
      '169': 'Soul and funk',
      '197': 'Latin',
      '464': 'Metal',
      label: 'Which music',
      none: 'Pick none and you get every genre.'
    },
    home: {
      description:
        'One screen plays the track and shows the QR code. Everyone else answers on whatever they have in their hand, and the first to know it wins the round.'
    },
    listening: 'Listening…',
    name: 'Blind test',
    reveal: {
      title: 'It was'
    },
    scoring: {
      buzzer:
        'First to buzz answers out loud. The host judges the title and the artist, a point each — a wrong answer sits you out for the rest of the round.',
      choice:
        'Everyone picks, over the same clip. The right one scores a point, and the first two to find it earn +2 and +1 on top.',
      typed:
        'Everyone types, over the same clip. Title and artist score a point each and both together score three, and the first two to get it right earn +2 and +1 on top.'
    },
    source: {
      chart: 'Top charts',
      label: 'Where the tracks come from',
      noneInPlaylist: 'Nothing playable in that playlist. Check the id.',
      noneInSearch: 'Nothing well-known enough matched. Try another search.',
      playlist: 'A Deezer playlist',
      playlistId: 'Playlist id',
      playlistIdHint: 'The number at the end of the playlist’s Deezer address.',
      preview: 'See what that finds',
      query: 'Search for',
      ready: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} track ready', other: '{?} tracks ready' } }
      }),
      search: 'A search'
    },
    tagline: 'Name the track before anyone else.',
    verdict: {
      artistOnly: 'Artist only',
      both: 'Title + artist',
      miss: 'Wrong',
      titleOnly: 'Title only'
    }
  },
  buzz: {
    action: 'Buzz',
    blocked: {
      host_away: 'The host dropped out. Everything is on hold.',
      round_not_running: 'Waiting for the host',
      someone_else_buzzed: 'Someone got there first',
      you_already_missed: 'You are out for this round',
      your_answer_is_pending: 'Say your answer out loud'
    },
    ready: 'Hit it the moment you know',
    sendFailed: 'That buzz did not get through. Hit it again.',
    theyBuzzed: '{nickname} buzzed',
    won: 'You are in. Say it out loud'
  },
  buzzer: {
    clearLockouts: 'Let everyone back in',
    home: {
      description:
        'You bring the questions — a charade, a quiz off a sheet of paper, a lesson, whatever the room is up for. This screen only decides who put their thumb down first, and it never gets that wrong.'
    },
    lockout: 'A wrong answer sits you out',
    name: 'Buzzer',
    running: 'Ask away',
    scoring:
      'First thumb answers out loud, and the host says right or wrong. A point for right — and a wrong answer sits you out until the host lets you back in.',
    tagline: 'Your questions, and a race to the buzzer.'
  },
  connection: {
    clock: '· clock ±{milliseconds:number} ms',
    closed: 'Reconnecting',
    connecting: 'Connecting',
    open: 'Live',
    refused: 'Disconnected'
  },
  /**
   * These two sentences are not blurb. CC BY-SA 4.0 §3(a)(1)(B) asks that a
   * modification be indicated, and it is the one item on that list owed
   * whatever the upstream supplied — so each has to stay true to what the
   * ingestion in `apps/server/scripts/` actually does to that bank.
   */
  credits: {
    openquizzdb:
      'Its rubrics were mapped onto the six subjects used here, its anecdotes kept as the line shown once an answer is public, and its adult-rated questions marked so a host can leave them out. Questions that did not carry exactly three wrong answers were left behind.',
    opentdb:
      'Its text arrives HTML-encoded and was decoded, its categories were mapped onto the six subjects used here, and questions that did not carry exactly three wrong answers were left behind.',
    shareAlike:
      'The assembled bank is shared under the same licence, and the code that assembles it is open.',
    title: 'Credits',
    whatChanged: 'What we changed'
  },
  error: {
    already_buzzed: 'Someone got there first.',
    api: {
      rate_limited: 'That is a lot of rooms. Wait a minute and retry.',
      rejected: 'The server refused that.',
      unexpected_response: 'The server answered something unexpected.',
      unreachable: 'Could not reach the server. Try again in a moment.'
    },
    cannot_vote_for_own_lie: 'That one is yours. Pick another.',
    host_already_connected: 'Someone is already hosting this room.',
    host_only_action: 'Only the host can do that.',
    internal_error: 'Something broke on the server.',
    invalid_message: 'The server did not understand that message.',
    joined_mid_round: 'You are in from the next round.',
    lie_is_the_answer: 'That is the real answer. Make something up instead.',
    music_source_unavailable: 'The music service is not answering.',
    nickname_taken: 'Someone already took that nickname.',
    no_content_available: 'Nothing left to play. Try other settings.',
    no_game_chosen: 'Pick a game first.',
    player_locked_out: 'You are out for this round.',
    protocol_version_mismatch: 'This page is out of date. Reload it.',
    rate_limited: 'That is a lot of rooms. Wait a minute and retry.',
    room_closed: 'The host closed the room.',
    room_full: 'That room is full.',
    room_not_found: 'That room does not exist.',
    screen: {
      description:
        'The game hit something it could not carry on from. Reloading almost always fixes it — and if the site updated while this tab was open, it always does.',
      reload: 'Reload the page',
      title: 'Something broke'
    },
    stale_round: 'That round is already over.',
    wrong_phase: 'Too late, the game has moved on.'
  },
  home: {
    games: 'The games',
    tagline: 'Party games for one screen and everyone’s phone.',
    title: 'Taverla'
  },
  host: {
    answerMode: {
      buzzer: 'First to buzz',
      choice: 'Four choices',
      label: 'How to answer',
      typed: 'Type it'
    },
    answerWindow: {
      label: 'Time to answer after a buzz'
    },
    autoAdvance: 'Chain rounds by itself',
    backToRoom: 'Back to the room',
    closeRoom: {
      confirm: 'Yes, close it',
      label: 'Close the room',
      warning: 'Everyone is disconnected, and the code stops working.'
    },
    copied: 'Copied',
    copyCode: 'Copy the code',
    copyFailed: 'Could not copy',
    countdown: 'Countdown',
    endGame: 'End the game',
    final: {
      nobody: 'Nobody scored',
      score: defineTranslation('{points:plural}', {
        plural: { points: { one: '{?} point', other: '{?} points' } }
      }),
      tie: 'It is a tie',
      winner: 'The winner'
    },
    game: {
      label: 'Which game',
      prompt: 'Pick one and the room is set. You can change your mind later.'
    },
    hostDecides: 'You decide',
    invite: {
      title: 'Scan to play'
    },
    joinLate: 'Still open',
    needsGame: 'Pick what the room is playing',
    needsPlayer: 'The game needs at least one player',
    nextRound: 'Next round',
    playAgain: 'Play again',
    players: {
      empty: 'Nobody has joined yet. The QR code is waiting.',
      remove: 'Remove',
      removeNamed: 'Remove {nickname}',
      title: 'Players'
    },
    reveal: 'Give it away',
    roundCount: {
      open: 'No end',
      openSummary: 'Until you stop',
      summary: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} round', other: '{?} rounds' } }
      })
    },
    rounds: 'Rounds',
    seat: {
      action: 'Take a seat',
      description: 'This screen stops being told the answer until the reveal.',
      label: 'Play too, as',
      leave: 'Give up the seat',
      taken: 'You are playing as {nickname}.'
    },
    seconds: '{seconds:number}s',
    seeResults: 'See the results',
    setup: {
      label: 'Settings',
      roundInPlay: 'Some of these wait until the round is over'
    },
    startGame: 'Start the game',
    verdict: {
      right: 'Right',
      wrong: 'Wrong'
    },
    volume: 'Volume'
  },
  join: {
    divider: 'or',
    host: {
      action: 'Create a room',
      description: 'Opens the console with the QR code your friends scan.'
    },
    player: {
      action: 'Join',
      title: 'Join a game'
    },
    roomCode: {
      description: 'Shown on the host screen.',
      label: 'Room code',
      unknown: 'No game is running under that code.',
      unsupportedCharacters: 'A room code never contains {characters}.',
      wrongLength: defineTranslation('{length:plural}', {
        plural: {
          length: {
            one: 'A room code is {?} character long.',
            other: 'A room code is {?} characters long.'
          }
        }
      })
    }
  },
  lefake: {
    home: {
      description:
        'One screen asks a question whose answer nobody sees coming. Everyone invents a convincing wrong one, the screen puts them all up beside the truth, and the room votes. You score for spotting the real answer — and for every player who falls for yours.'
    },
    name: 'Le Fake',
    reveal: {
      fooled: defineTranslation('{count:plural}', {
        plural: { count: { other: '{?} fell for it' } }
      }),
      found: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} found it', other: '{?} found it' } }
      }),
      nobody: 'Nobody wrote that one',
      title: 'The truth was'
    },
    scoring:
      'Everyone writes a fake answer, then the room votes on the lot. Two points for finding the real one, and one more for every player who falls for yours.',
    tagline: 'Write a lie. Fool the table.',
    vote: {
      done: 'Your vote is in. Waiting for the others…',
      duration: 'Time to vote',
      title: 'Which one is true?',
      waiting: defineTranslation('{count:plural}', {
        plural: { count: { other: '{?} voted so far' } }
      }),
      yours: 'Yours'
    },
    write: {
      description: 'Something they will believe. The real answer gets refused.',
      duration: 'Time to write',
      label: 'Your lie',
      sent: 'Your lie is in. Waiting for the others…',
      /**
       * Its own rather than the shell's `round.answer.waiting`: nobody is
       * answering anything yet, and "0 answered" over a field asking for a lie
       * reads as a round that has already gone wrong.
       */
      waiting: defineTranslation('{count:plural}', {
        plural: { count: { other: '{?} written so far' } }
      })
    }
  },
  /**
   * The app itself arriving, which is the one wait with nothing more specific
   * to say: at this point the route has not resolved and no room is known.
   */
  loading: 'Loading…',
  menu: {
    build: 'Build {build}',
    home: 'Home',
    label: 'Menu',
    leaveRoom: 'Leave the room'
  },
  notFound: {
    back: 'Back to the start',
    description: 'That game is over, or the code was mistyped.',
    title: 'Nothing here'
  },
  player: {
    choosingGame: 'The host is choosing a game',
    final: {
      placing: 'You finished',
      rank: defineTranslation('{rank:plural}', {
        plural: {
          rank: {
            few: '{?}rd',
            one: '{?}st',
            other: '{?}th',
            two: '{?}nd',
            type: 'ordinal'
          }
        }
      })
    },
    nickname: {
      action: 'Join the game',
      label: 'Nickname',
      title: 'What should we call you?'
    },
    points: defineTranslation('{points:plural}', {
      plural: { points: { one: 'point', other: 'points' } }
    }),
    room: 'Room {code}',
    roomSize: '{count:number} in the room',
    seating: 'Taking your seat…',
    upNext: 'You are about to play',
    you: 'You'
  },
  preferences: {
    language: 'Language',
    theme: {
      dark: 'Dark',
      label: 'Theme',
      light: 'Light',
      system: 'System'
    }
  },
  quiz: {
    adult: {
      hint: 'You are the only one who knows who is in the room.',
      label: 'Include adult questions'
    },
    category: {
      arts: 'Arts and culture',
      everyday: 'Everyday life',
      geography: 'Geography',
      history: 'History',
      label: 'Which subjects',
      none: 'Pick none and you get every subject.',
      science: 'Science',
      sport: 'Sport'
    },
    duration: 'Time per question',
    home: {
      description:
        'Questions on everything — history, science, sport, the everyday. One screen asks, everyone answers on whatever they have in their hand, and the fastest right answer takes the round.'
    },
    language: 'Question language',
    name: 'Quiz',
    reveal: {
      title: 'The answer was'
    },
    scoring: {
      buzzer:
        'First to buzz answers out loud, and the host says right or wrong. A point for right — and a wrong answer sits you out for the rest of the round.',
      choice:
        'Everyone picks from four, against the clock. The right one scores a point, and the first two to find it earn +2 and +1 on top.',
      typed:
        'Everyone types, against the clock. The right answer scores three, and the first two to get it right earn +2 and +1 on top.'
    },
    tagline: 'A question, and the first one who knows it.'
  },
  round: {
    answer: {
      correct: 'You got it. Sit back.',
      label: 'Your answer',
      locked: 'Answer sent. Waiting for the others…',
      retry: 'As many goes as you like.',
      submit: 'Send it',
      waiting: defineTranslation('{count:plural}', {
        plural: { count: { other: '{?} in so far' } }
      })
    },
    index: 'Round {index:number} of {total:number}',
    indexOpen: 'Round {index:number}',
    nobody: 'Nobody got it',
    scored: '+{points:number}'
  }
})
