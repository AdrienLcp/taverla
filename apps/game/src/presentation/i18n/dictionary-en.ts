import { defineTranslation } from '@adrienlcp/i18n/define-translation'
import { defineDictionary } from '@adrienlcp/i18n/dictionary'

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
export const EN_DICTIONARY = defineDictionary({
  blindtest: {
    answer: {
      anyOrder: 'The title, the artist, or both — as many goes as you like.',
      anyOrderFilm:
        'The film, the composer, or both — as many goes as you like.',
      artistFound: 'Artist ✓',
      bothFound: 'You have both. Sit back.',
      composerFound: 'Composer ✓',
      filmFound: 'Film ✓',
      titleFound: 'Title ✓'
    },
    /**
     * The one screen in the product that admits to being silent. A console that
     * reloaded mid-round never asked the browser for permission, and nothing on
     * the screen would otherwise say so.
     */
    audio: {
      /**
       * What the last press got. Without these the offer above repeats itself
       * for the whole evening and nothing on the screen ever says that every
       * press has already failed.
       *
       * `blocked` names the site's sound permission rather than saying "try
       * again", because the press behind it is always a real gesture — both
       * `unlock()` call sites are synchronous inside `onPress` — so a
       * `NotAllowedError` here is a setting rather than a mistimed press, and
       * pressing again answers it identically for the rest of the evening.
       *
       * All three end on the same way out, so a console that cannot be fixed
       * where it stands is told once what to do instead of three times what
       * went wrong.
       */
      refused: {
        blocked:
          'The browser refused the sound. Allow it for this site, or run the room from another screen.',
        broken:
          'It broke on our side. Try again, or run the room from another screen.',
        unsupported:
          'This screen cannot play the clip. Run the room from another screen.'
      },
      silent: 'No sound is coming from here.',
      start: 'Start the music'
    },
    clip: 'Clip length',
    decade: {
      '1970s': '70s',
      '1980s': '80s',
      '1990s': '90s',
      '2000s': '2000s',
      '2010s': '2010s',
      '2020s': '2020s',
      label: 'Which years',
      none: 'Pick none and you get every decade.'
    },
    difficulty: {
      label: 'How well known',
      mixed: 'Deep cuts too',
      obscure: 'For the experts',
      pinnedByFilms:
        'Film scores set their own level — nothing here is a chart single.',
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
        'Three notes are sometimes enough, and the whole table is already hunting. Title, artist, or both: the quickest to know takes the round.'
    },
    listening: 'Listening…',
    name: 'Blind test',
    reveal: {
      title: 'It was'
    },
    scoring: {
      buzzer:
        'First to buzz answers out loud. The innkeeper judges the title and the artist, a point each — a wrong answer sits you out for the rest of the round.',
      choice:
        'Four answers over the same clip, everyone at once. The right one scores a point, and the earlier you find it the more the clock adds — up to double.',
      typed:
        'Everyone types, over the same clip. Title and artist score a point each and both together score three, and the earlier you get it the more the clock adds — up to double.'
    },
    scoringFilm: {
      buzzer:
        'First to buzz answers out loud. The innkeeper judges the film and the composer, a point each — a wrong answer sits you out for the rest of the round.',
      typed:
        'Everyone types, over the same clip. Film and composer score a point each and both together score three, and the earlier you get it the more the clock adds — up to double.'
    },
    source: {
      chart: 'Top charts',
      decade: 'A decade',
      film: 'Film scores',
      filmHint:
        'What a composer wrote for a film or a series — not the songs on its soundtrack.',
      label: 'Where the tracks come from',
      noneInDecade: 'Nothing playable in those years. Try another decade.',
      noneInFilms:
        'Nothing playable came back from the composers. Try another source.',
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
      bothFilm: 'Film + composer',
      composerOnly: 'Composer only',
      filmOnly: 'Film only',
      miss: 'Wrong',
      titleOnly: 'Title only'
    }
  },
  buzz: {
    action: 'Buzz',
    blocked: {
      host_away: 'The innkeeper stepped away. Everything is on hold.',
      round_not_running: 'Waiting for the innkeeper',
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
    clearLockouts: 'Let the table back in',
    home: {
      description:
        'You bring the questions — a charade, a quiz off a sheet of paper, a lesson, whatever the table is up for. Only one thing gets settled here: who was in first. And that is never in doubt.'
    },
    lockout: 'A wrong answer sits you out',
    name: 'Buzzer',
    running: 'Ask away',
    scoring:
      'First in answers out loud, and the innkeeper says right or wrong. A point for right — and a wrong answer sits you out until they let you back in.',
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
   * These three sentences are not blurb. CC BY-SA 4.0 §3(a)(1)(B) asks that a
   * modification be indicated, and it is the one item on that list owed
   * whatever the upstream supplied — so each has to stay true to what the
   * ingestion in `apps/server/scripts/` actually does to that bank.
   */
  credits: {
    mintaka:
      'It supplies questions and no wrong answers at all, so the three candidates beside each right one were built here, out of entities Wikidata files under the same kind as the answer and that are read about roughly as much in French. Five of its eight rubrics were kept and mapped onto the eight subjects used here, along with four of its nine question shapes — the others name their own candidates in the question, accept more answers than they record, or ask in two hops. Questions that name the present were left behind, the corpus being fixed at October 2021. Of what remained, only the ones whose answer and whose subject have a French Wikipedia article people actually read were banked, and no answer comes up more than five times in one subject.',
    openquizzdb:
      'Its rubrics were mapped onto the eight subjects used here, its anecdotes kept as the line shown once an answer is public, and its adult-rated questions marked so an innkeeper can leave them out. Questions that did not carry exactly three wrong answers were left behind, as were the ones whose wrong answers cannot be told from the right one once written down. One answer spelled against its own anecdote was corrected.',
    opentdb:
      'Its text arrives HTML-encoded and was decoded, its categories were mapped onto the eight subjects used here, and questions that did not carry exactly three wrong answers were left behind, as were the ones whose wrong answers cannot be told from the right one once written down.',
    polyfact:
      'It is built from Wikidata in fourteen question shapes, and seven of them were kept and mapped onto the eight subjects used here — the others ask about hamlets nobody has heard of, or give the answer away in the question. Of what remained, only the questions whose subject and whose four candidates all have a French Wikipedia article people actually read were banked. A wrong answer the source leaned on far too often was swapped for one it had barely used, and questions whose wrong answers cannot be told from the right one once written down were left behind.',
    shareAlike:
      'The assembled bank is shared under the same licence, and the code that assembles it is open.',
    title: 'Credits',
    vikidia:
      'Its quizzes are written in wikitext and were parsed line by line into a question, an answer and three wrong answers. Each of its pages was mapped by hand onto one of the eight subjects used here, the wiki having no rubrics to fold; the ones about the wiki itself were left out. Questions carrying fewer than four candidates, questions with several right answers, and questions whose whole point is a mathematical formula, a piece of code or a picture were left behind. Templates carrying a unit or a quotation were replaced by what they print. Every question kept was read once: the false ones were removed, the ones whose wording no longer named its own subject were completed, and the ones that can only be won by picking were marked.',
    whatChanged: 'What we changed'
  },
  error: {
    already_buzzed: 'Someone got there first.',
    api: {
      rate_limited: 'That is a lot of tables. Wait a minute and retry.',
      rejected: 'That did not go through. Try again.',
      unexpected_response: 'We did not know what to make of that. Try again.',
      unreachable: 'We cannot reach the tavern. Try again in a moment.'
    },
    cannot_vote_for_own_lie: 'That one is yours. Pick another.',
    false_start: 'Too soon. Wait for the change.',
    host_already_connected: 'Someone is already keeping this table.',
    host_away: 'The innkeeper stepped away. The round is waiting for them.',
    host_only_action: 'Only the innkeeper can do that.',
    host_reconnecting:
      'This table has just lost its innkeeper, and is waiting for them.',
    internal_error: 'Something broke on our side. Try again.',
    invalid_message: 'We did not understand that. Try again.',
    joined_mid_round: 'You are in from the next round.',
    lie_is_the_answer: 'That is the real answer. Make something up instead.',
    music_source_unavailable:
      'The music has stopped answering. Try again in a moment.',
    nickname_taken: 'Someone already took that nickname.',
    no_content_available: 'Nothing left to play. Try other settings.',
    no_game_chosen: 'Pick a game first.',
    player_locked_out: 'You are out for this round.',
    protocol_version_mismatch: 'This page is out of date. Reload it.',
    rate_limited: 'That is a lot of tables. Wait a minute and retry.',
    removed_by_host: 'The innkeeper removed you from the table.',
    room_closed: 'The innkeeper cleared the table.',
    room_full: 'That table is full.',
    room_not_found: 'No table under that code.',
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
    heldRooms: {
      host: 'Your table',
      player: 'Your seat',
      title: 'Where you were'
    },
    tagline: 'The tavern is open.',
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
    autoAdvance: 'Time before the next round',
    backToRoom: 'Back to the table',
    closeRoom: {
      confirm: 'Yes, clear it',
      label: 'Clear the table',
      warning: 'The whole table is sent out, and the code stops working.'
    },
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
      prompt: 'Pick one and the table is set. You can change your mind later.'
    },
    hostDecides: 'You decide',
    needsGame: 'Pick what the table is playing',
    needsPlayer: 'You need at least one at the table',
    nextRound: 'Next round',
    playAgain: 'Play again',
    players: {
      empty: 'Nobody yet. That will not last.',
      remove: 'Remove',
      removeNamed: 'Remove {nickname}',
      title: 'The table'
    },
    recovery: {
      action: 'Keep the table from here',
      description: 'It is in the innkeeper’s own menu.',
      field: 'Recovery code',
      hint: 'Type it elsewhere to take the table over from there.',
      invalid: 'That is not a recovery code.',
      refused: 'That code does not match this table.',
      retry: 'Try again',
      reveal: 'Show the recovery code'
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
      /**
       * What the seat costs, which is not the same thing in a game with no
       * answer to hold back: there the screen is the whole of it, and promising
       * a hidden answer would name something the round does not have.
       */
      cost: {
        hiddenAnswer: 'You stop seeing the answer before everyone else.',
        sharedScreen: 'You race on the screen the whole table is watching.'
      },
      /**
       * Why there is no seat here, where the room could have one. It names the
       * way out rather than the rule, because the strip that undoes it is on
       * the same screen a few lines up.
       */
      judged:
        'You judge the buzzes, so there is no seat here. Any other way to answer gives you one.',
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
    startGame: 'Gather round',
    verdict: {
      right: 'Right',
      wrong: 'Wrong'
    }
  },
  invite: {
    copied: 'Copied',
    copyCode: 'Copy the code',
    copyFailed: 'Could not copy',
    documentTitle: 'Invitation — Taverla',
    door: {
      action: 'Show it',
      description:
        'It grants nothing: no seat, no game, and no way to run the table. It draws what the table is already showing.',
      label: 'Show a table’s invitation',
      summary: 'The code and the square, on a screen of their own'
    },
    joinLate: 'The door is open',
    project: 'On its own screen',
    title: 'Scan and pull up a chair',
    unknown: {
      description:
        'That code opens no table. It may have been cleared, or read wrong.',
      title: 'No table here'
    }
  },
  join: {
    divider: 'or',
    host: {
      action: 'Open a table',
      description: 'You keep the table. The others just have to walk in.'
    },
    player: {
      action: 'Pull up a chair',
      title: 'Walk in'
    },
    roomCode: {
      description: 'The innkeeper has it in front of them.',
      label: 'Table code',
      unknown: 'No table under that code.',
      unsupportedCharacters: 'A table code never contains {characters}.',
      wrongLength: defineTranslation('{length:plural}', {
        plural: {
          length: {
            one: 'A table code is {?} character long.',
            other: 'A table code is {?} characters long.'
          }
        }
      })
    }
  },
  lefake: {
    home: {
      description:
        'A question whose answer nobody sees coming. Everyone invents one convincing enough to fool the rest, they all go up beside the truth, and the table votes. You score for spotting the real one, and again for every friend who bites.'
    },
    name: 'Le Fake',
    reveal: {
      fooled: defineTranslation('{count:plural}', {
        plural: { count: { other: '{?} fell for it' } }
      }),
      /** Named while the list is short enough to read; counted past that. */
      fooledNames: 'Fooled: {names}',
      found: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} found it', other: '{?} found it' } }
      }),
      foundBy: 'Found by {names}',
      nobody: 'Nobody wrote that one',
      title: 'The truth was'
    },
    scoring:
      'Everyone writes a fake answer, then the table votes on the lot. Two points for finding the real one, and one more for every player who falls for yours.',
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
    leaveRoom: 'Leave the table',
    /**
     * `label` names the row and its summary is the name itself, which is the
     * only place a screen that skipped the join form ever shows it. `field` is
     * what the empty box below asks for, and it says *new* because the row
     * above is already carrying the old one.
     */
    nickname: {
      action: 'Change',
      field: 'New nickname',
      label: 'Nickname'
    }
  },
  /**
   * The way back to the front door, from any page that is a dead end without
   * one. Three screens show it — nothing here, a refused socket, the credits —
   * and one destination is named one way or the product has three fronts.
   */
  navigation: {
    back: 'Back to the tavern'
  },
  notFound: {
    description: 'That game is over, or the code was mistyped.',
    documentTitle: 'Nobody here — Taverla',
    title: 'Nobody here'
  },
  player: {
    /** A seat whose screen has gone quiet — beside that name, on every board. */
    away: 'away',
    choosingGame: 'The innkeeper is choosing a game',
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
    midRound: {
      detail: 'Your seat is safe — this\u00a0round started without you.',
      title: 'Next round'
    },
    nickname: {
      action: 'Pull up a chair',
      label: 'Nickname',
      title: 'What should we call you?'
    },
    points: defineTranslation('{points:plural}', {
      plural: { points: { one: 'point', other: 'points' } }
    }),
    room: 'Table {code}',
    roomSize: '{count:number} at the table',
    seating: 'Taking your seat…',
    standing: {
      /** The room's board, reduced to the two facts a screen held in a hand needs. */
      ofRoom: defineTranslation('{rank:plural} of {count:number}', {
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
    /** Names the lobby roster for a reader who cannot see whose names those are. */
    table: 'At the table',
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
    },
    volume: 'Volume'
  },
  quiz: {
    adult: {
      hint: 'You are the only one who knows who is at the table.',
      label: 'Include adult questions'
    },
    category: {
      arts: 'Arts and culture',
      cinema: 'Cinema',
      everyday: 'Everyday',
      geography: 'Geography',
      history: 'History',
      label: 'Which subjects',
      none: 'Pick none and you get every subject.',
      science: 'Science',
      sport: 'Sport',
      videogames: 'Video games'
    },
    duration: 'Time per question',
    home: {
      description:
        'History, science, sport, and questions nobody sees coming. Everyone answers at once, and the fastest right answer takes the round.'
    },
    language: 'Question language',
    name: 'Quiz',
    reveal: {
      title: 'The answer was'
    },
    scoring: {
      buzzer:
        'First to buzz answers out loud, and the innkeeper says right or wrong. A point for right — and a wrong answer sits you out for the rest of the round.',
      choice:
        'Four answers, everyone at once. The right one scores a point, and the earlier you find it the more the clock adds — up to double.',
      typed:
        'Everyone types their answer at once. The right one scores three, and the earlier you find it the more the clock adds — up to double.'
    },
    tagline: 'A question, and the first one who knows it.',
    wellKnown: {
      hint: 'Fewer to draw from, but nobody is left stuck.',
      label: 'Stay on the crowd-pleasers'
    }
  },
  reflex: {
    falseStart: {
      detail: 'You watch this one from the bench.',
      title: 'Gone before the screen changed.'
    },
    flip: 'GO',
    hold: 'Press before it changes and you sit the round out.',
    home: {
      description:
        'Nothing to know and nothing to say. The screen holds still, then it changes — and the first in takes the round. Go before it changes and you watch that one from the bench.'
    },
    landed: defineTranslation('{count:plural}', {
      plural: { count: { one: '{?} player in', other: '{?} players in' } }
    }),
    name: 'Reflex',
    nobody: 'Nobody moved',
    pressed: 'In.',
    reaction: '{milliseconds:number} ms',
    scoring:
      'The screen changes, and the first in takes the point. Go before it changes and you sit the round out.',
    tagline: 'The screen changes. First in wins.',
    tooEarly: 'too early',
    waiting: 'Watch the screen.'
  },
  room: {
    documentTitle: '{game} — Taverla',
    documentTitleLobby: 'Taverla'
  },
  round: {
    answer: {
      correct: 'You got it. Sit back.',
      label: 'Your answer',
      locked: 'Answer sent. Waiting for the others…',
      /**
       * Read together with `retry` under the field: this half says what the
       * guess did, that half says the way out. It is proof of delivery as much
       * as a grade — without it a wrong guess and a dropped frame look alike.
       */
      missed: 'Not that one.',
      oneShot: 'One pick only, and the sooner pays the more.',
      retry: 'As many goes as you like.',
      submit: 'Send it',
      waiting: defineTranslation('{count:plural}', {
        plural: { count: { other: '{?} in so far' } }
      })
    },
    /**
     * What the round paid, on the screen the whole room is watching. The clock's
     * share is split off rather than folded in, in the `+N` the product uses
     * everywhere else, because a lone `+4` beside a `+2` says only that two
     * players differ — the split is the rule saying itself, and it is how the
     * table learns that answering early pays without anybody explaining it.
     */
    award: '{points:number}',
    awardWithSpeed: '{answer:number} +{speed:number}',
    index: 'Round {index:number} of {total:number}',
    indexOpen: 'Round {index:number}',
    /**
     * The zero arm of `scored`, and the reason the reveal draws a block on
     * every player's screen rather than only on the ones that gained: a round
     * that paid you nothing is a result, and a screen that says nothing about
     * it leaves its owner to work out from an absence whether it was even
     * scored.
     */
    missed: 'Nothing this time.',
    nobody: 'Nobody got it',
    scored: '+{points:number}',
    /**
     * Why two players who both got it right did not get the same. The clock
     * replaced a rank the room could count, so what it paid has to be said.
     */
    speedBonus: '{points:number} of that for being early'
  },
  slate: {
    board: {
      close: 'Collect',
      closeItem: 'Collect {item} and mark it now',
      markItem: 'Mark {item}',
      show: 'Mark',
      state: {
        closed: 'To mark',
        marked: 'Marked',
        open: '{filled:number}/{count:number} written'
      }
    },
    correct: {
      blanks: 'Left blank: {names}',
      finish: 'Show the scores',
      judge: 'Right',
      key: {
        reveal: 'Show the answer',
        title: 'The answer'
      },
      next: 'Next',
      nobody: 'Nobody wrote anything for this one.',
      previous: 'Previous'
    },
    home: {
      description:
        'Numbered things to guess — cups to taste, photos, prices — and everyone writes on a sheet nobody else can see, in any order they like. Then the innkeeper marks the papers one number at a time, and every answer they accept is worth a point.'
    },
    item: 'No. {index:number}',
    itemOf: 'No. {index:number} of {count:number}',
    items: {
      add: 'One more',
      label: 'Things to guess',
      summary: defineTranslation('{count:plural}', {
        plural: {
          count: { one: '{?} thing to guess', other: '{?} things to guess' }
        }
      })
    },
    key: {
      field: 'Answer for {item}',
      label: 'Answer key',
      summary: defineTranslation('{count:plural}', {
        plural: { count: { other: 'Hidden · {?} noted' } }
      })
    },
    labels: {
      duplicate: 'Another item already shows this.',
      hint: 'Leave a box empty to keep its number. A letter, an emoji or a short word all work.',
      label: 'Names on the items',
      none: 'Numbered 1, 2, 3…',
      some: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} named', other: '{?} named' } }
      })
    },
    marking: {
      now: 'Being marked'
    },
    name: 'Slate',
    progress: '{filled:number}/{count:number}',
    scoring:
      'Everyone fills in their own sheet in private, then the innkeeper marks it: one point per answer they accept.',
    sheet: {
      blank: 'Left blank',
      closedBeforeYou: 'Collected before you arrived',
      field: 'Your answer for {item}',
      grid: 'Your sheet',
      next: 'Next',
      previous: 'Previous',
      saved:
        'Saved as you write. You can change an answer until the innkeeper collects it.',
      tile: {
        empty: '{item}, empty',
        filled: '{item}: {answer}',
        locked: '{item}, collected'
      }
    },
    tagline: 'Everyone writes. Nobody peeks.',
    verdict: {
      pending: 'Waiting for the innkeeper…',
      right: 'Accepted',
      wrong: 'Not this time'
    },
    wall: {
      collect: 'Collect the sheets',
      collectRest: 'Collect the rest',
      filling: 'Sheets are open. Write what you think each one is.',
      toSheets: 'Back to the sheets',
      toWall: 'Back to marking'
    },
    yourAnswer: 'You wrote',
    yourSheet: 'Your whole sheet'
  }
})
