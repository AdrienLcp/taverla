import { defineTranslation } from '@taverla/core/i18n/define-translation'

import type { Dictionary } from './translation'

/**
 * French typography puts a non-breaking space before `?`, `!` and `:`. Writing
 * it as \u00a0 keeps it visible to whoever edits this file, and survives an
 * editor that strips invisible characters.
 *
 * French counts 0 as singular. Every `one` form below therefore covers both 0
 * and 1, which is the whole reason these keys carry plural forms rather than a
 * word chosen at the call site.
 */
export const FR_DICTIONARY: Dictionary = {
  blindtest: {
    answer: {
      anyOrder:
        'Le titre, l’artiste, ou les deux — autant d’essais que tu veux.',
      artistFound: 'Artiste ✓',
      bothFound: 'Tu as les deux. Tranquille.',
      titleFound: 'Titre ✓'
    },
    audio: {
      silent: 'Le son ne sort pas d’ici.',
      start: 'Lancer le son'
    },
    clip: 'Durée de l’extrait',
    difficulty: {
      label: 'À quel point c’est connu',
      mixed: 'Un peu pointu',
      obscure: 'Pour les experts',
      wellKnown: 'Grand public'
    },
    genre: {
      '52': 'Chanson française',
      '106': 'Électro',
      '113': 'Dance',
      '116': 'Rap et hip-hop',
      '129': 'Jazz',
      '132': 'Pop',
      '144': 'Reggae',
      '152': 'Rock',
      '165': 'R&B',
      '169': 'Soul et funk',
      '197': 'Latino',
      '464': 'Metal',
      label: 'Quelle musique',
      none: 'N’en choisis aucun et tu as tous les genres.'
    },
    home: {
      description:
        'Trois notes suffisent parfois, et toute la tablée cherche déjà. Titre, artiste, ou les deux : le plus rapide à savoir rafle la tournée.'
    },
    listening: 'À l’écoute…',
    name: 'Blind test',
    reveal: {
      title: 'C’était'
    },
    scoring: {
      buzzer:
        'Le premier qui buzze répond à voix haute. L’aubergiste juge le titre et l’artiste, 1 point chacun — une mauvaise réponse te met hors-jeu pour le reste de la tournée.',
      choice:
        'Quatre propositions sur le même extrait, et tout le monde répond. La bonne rapporte 1 point, et plus tu la trouves tôt, plus la montre ajoute — jusqu’à +3.',
      typed:
        'Tout le monde tape, sur le même extrait. Titre et artiste rapportent 1 point chacun, les deux ensemble 3, et plus tu trouves tôt, plus la montre ajoute — jusqu’à +3.'
    },
    source: {
      chart: 'Le top du moment',
      label: 'D’où viennent les titres',
      noneInPlaylist:
        'Rien de jouable dans cette playlist. Vérifie l’identifiant.',
      noneInSearch:
        'Rien d’assez connu ne correspond. Essaie une autre recherche.',
      playlist: 'Une playlist Deezer',
      playlistId: 'Identifiant de playlist',
      playlistIdHint: 'Le nombre à la fin de l’adresse Deezer de la playlist.',
      preview: 'Voir ce que ça donne',
      query: 'Rechercher',
      ready: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} titre prêt', other: '{?} titres prêts' } }
      }),
      search: 'Une recherche'
    },
    tagline: 'Trouve le titre avant tout le monde.',
    verdict: {
      artistOnly: 'Artiste seulement',
      both: 'Titre + artiste',
      miss: 'Raté',
      titleOnly: 'Titre seulement'
    }
  },
  buzz: {
    action: 'Buzz',
    blocked: {
      host_away: 'L’aubergiste a décroché. Tout est en pause.',
      round_not_running: 'En attente de l’aubergiste',
      someone_else_buzzed: 'Quelqu’un a été plus rapide',
      you_already_missed: 'Tu es hors-jeu pour cette tournée',
      your_answer_is_pending: 'Donne ta réponse à voix haute'
    },
    ready: 'Appuie dès que tu sais',
    sendFailed: 'Ce buzz n’est pas parti. Réappuie.',
    theyBuzzed: '{nickname} a buzzé',
    won: 'C’est à toi. Annonce\u00a0!'
  },
  buzzer: {
    clearLockouts: 'Remettre la tablée en jeu',
    home: {
      description:
        'Les questions, c’est toi qui les apportes — une charade, un quiz sur une feuille, une leçon, ce que la tablée veut. Ici on ne tranche qu’une chose : qui a posé le pouce en premier. Et là-dessus, jamais de discussion.'
    },
    lockout: 'Une mauvaise réponse met hors-jeu',
    name: 'Buzzer',
    running: 'Pose ta question',
    scoring:
      'Le premier pouce répond à voix haute, et l’aubergiste dit si c’est bon. 1 point si c’est juste — et une mauvaise réponse te met hors-jeu jusqu’à ce qu’il te remette en jeu.',
    tagline: 'Tes questions, et une course au buzz.'
  },
  connection: {
    clock: '· horloge ±{milliseconds:number} ms',
    closed: 'Reconnexion…',
    connecting: 'Connexion…',
    open: 'En direct',
    refused: 'Déconnecté'
  },
  credits: {
    openquizzdb:
      'Ses rubriques ont été rattachées aux six sujets utilisés ici, ses anecdotes conservées comme la ligne affichée une fois la réponse dévoilée, et ses questions classées adulte signalées pour qu’un aubergiste puisse les laisser de côté. Les questions qui ne portaient pas exactement trois mauvaises réponses ont été écartées, comme celles dont une mauvaise réponse ne se distingue plus de la bonne une fois écrite. Une réponse mal orthographiée par rapport à sa propre anecdote a été corrigée.',
    opentdb:
      'Son texte arrive encodé en HTML et a été décodé, ses catégories ont été rattachées aux six sujets utilisés ici, et les questions qui ne portaient pas exactement trois mauvaises réponses ont été écartées, comme celles dont une mauvaise réponse ne se distingue plus de la bonne une fois écrite.',
    shareAlike:
      'La banque assemblée est diffusée sous la même licence, et le code qui l’assemble est ouvert.',
    title: 'Crédits',
    whatChanged: 'Ce qu’on a changé'
  },
  error: {
    already_buzzed: 'Quelqu’un a été plus rapide.',
    api: {
      rate_limited:
        'Ça fait beaucoup de tables. Attends une minute et réessaie.',
      rejected: 'Ça n’est pas passé. Réessaie.',
      unexpected_response: 'On n’a pas su quoi en faire. Réessaie.',
      unreachable:
        'On n’arrive pas à joindre la taverne. Réessaie dans un instant.'
    },
    cannot_vote_for_own_lie: 'Celle-là est la tienne. Choisis-en une autre.',
    host_already_connected: 'Quelqu’un tient déjà cette table.',
    host_only_action: 'Seul l’aubergiste peut faire ça.',
    host_reconnecting:
      'Cette table vient de perdre son aubergiste, et l’attend encore.',
    internal_error: 'Ça a cassé de notre côté. Réessaie.',
    invalid_message: 'On n’a pas compris. Réessaie.',
    joined_mid_round: 'Tu joues à partir de la prochaine tournée.',
    lie_is_the_answer: 'C’est la vraie réponse. Invente autre chose.',
    music_source_unavailable:
      'La musique ne répond plus. Réessaie dans un instant.',
    nickname_taken: 'Ce pseudo est déjà pris.',
    no_content_available: 'Il ne reste rien à jouer. Change les réglages.',
    no_game_chosen: 'Choisis d’abord un jeu.',
    player_locked_out: 'Tu es hors-jeu pour cette tournée.',
    protocol_version_mismatch: 'Cette page n’est plus à jour. Recharge-la.',
    rate_limited: 'Ça fait beaucoup de tables. Attends une minute et réessaie.',
    removed_by_host: 'L’aubergiste t’a retiré de la table.',
    room_closed: 'L’aubergiste a levé la table.',
    room_full: 'Cette table est complète.',
    room_not_found: 'Aucune table sous ce code.',
    screen: {
      description:
        'Le jeu est tombé sur quelque chose dont il ne sait pas repartir. Recharger suffit presque toujours — et si le site a été mis à jour pendant que cet onglet était ouvert, toujours.',
      reload: 'Recharger la page',
      title: 'Quelque chose a cassé'
    },
    stale_round: 'Cette tournée est déjà terminée.',
    wrong_phase: 'Trop tard, la partie est passée à autre chose.'
  },
  home: {
    games: 'Les jeux',
    tagline: 'La taverne est ouverte.',
    title: 'Taverla'
  },
  host: {
    answerMode: {
      buzzer: 'Le premier qui buzze',
      choice: 'Quatre propositions',
      label: 'Comment on répond',
      typed: 'On tape'
    },
    answerWindow: {
      label: 'Temps pour répondre après un buzz'
    },
    autoAdvance: 'Enchaîner tout seul',
    backToRoom: 'Retour à la table',
    closeRoom: {
      confirm: 'Oui, on lève',
      label: 'Lever la table',
      warning: 'Toute la tablée sort, et le code cesse de fonctionner.'
    },
    copied: 'Copié',
    copyCode: 'Copier le code',
    copyFailed: 'Copie impossible',
    countdown: 'Décompte',
    endGame: 'Terminer la partie',
    final: {
      nobody: 'Personne n’a marqué',
      score: defineTranslation('{points:plural}', {
        plural: { points: { one: '{?} point', other: '{?} points' } }
      }),
      tie: 'Égalité',
      winner: 'Le vainqueur'
    },
    game: {
      label: 'Quel jeu',
      prompt: 'Choisis-en un et la table est prête. Tu pourras changer d’avis.'
    },
    hostDecides: 'Tu décides',
    invite: {
      title: 'Scanne et prends place'
    },
    joinLate: 'La porte est ouverte',
    needsGame: 'Choisis à quoi la table joue',
    needsPlayer: 'Il faut au moins quelqu’un à table',
    nextRound: 'Tournée suivante',
    playAgain: 'Rejouer',
    players: {
      empty: 'Encore personne. Ça ne va pas durer.',
      remove: 'Retirer',
      removeNamed: 'Retirer {nickname}',
      title: 'La tablée'
    },
    recovery: {
      action: 'Tenir la table d’ici',
      description: 'Il est dans le menu, chez l’aubergiste.',
      field: 'Code de reprise',
      hint: 'À saisir ailleurs pour reprendre la table depuis là-bas.',
      invalid: 'Ce n’est pas un code de reprise.',
      refused: 'Ce code ne va pas avec cette table.',
      retry: 'Réessayer',
      reveal: 'Afficher le code de reprise'
    },
    reveal: 'Donner la réponse',
    roundCount: {
      open: 'Sans fin',
      openSummary: 'Jusqu’à ce que tu arrêtes',
      summary: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} tournée', other: '{?} tournées' } }
      })
    },
    rounds: 'Tournées',
    seat: {
      action: 'Prendre place',
      description: 'Tu ne verras plus la réponse avant les autres.',
      label: 'Jouer aussi, sous le nom de',
      leave: 'Rendre sa place',
      taken: 'Tu joues sous le nom de {nickname}.'
    },
    seconds: '{seconds:number} s',
    seeResults: 'Voir les résultats',
    setup: {
      label: 'Réglages',
      roundInPlay: 'Certains de ces réglages attendent la fin de la tournée'
    },
    startGame: 'À table\u00a0!',
    verdict: {
      right: 'Bonne réponse',
      wrong: 'Raté'
    },
    volume: 'Volume'
  },
  join: {
    divider: 'ou',
    host: {
      action: 'Ouvrir une table',
      description:
        'C’est toi qui tiens la table. Les autres n’ont plus qu’à pousser la porte.'
    },
    player: {
      action: 'Prendre place',
      title: 'Pousser la porte'
    },
    roomCode: {
      description: 'L’aubergiste l’a sous les yeux.',
      label: 'Code de la table',
      unknown: 'Aucune table sous ce code.',
      unsupportedCharacters:
        'Un code de table ne contient jamais {characters}.',
      wrongLength: defineTranslation('{length:plural}', {
        plural: {
          length: {
            one: 'Un code de table fait {?} caractère.',
            other: 'Un code de table fait {?} caractères.'
          }
        }
      })
    }
  },
  lefake: {
    home: {
      description:
        'Une question dont personne ne voit venir la réponse. Chacun en invente une assez crédible pour berner les autres, elles passent toutes à côté de la vraie, et la tablée vote. Tu marques en trouvant la vraie, et encore à chaque copain qui mord.'
    },
    name: 'Le Fake',
    reveal: {
      fooled: defineTranslation('{count:plural}', {
        plural: {
          count: {
            one: '{?} personne a mordu',
            other: '{?} personnes ont mordu'
          }
        }
      }),
      fooledNames: 'Ça a mordu\u00a0: {names}',
      found: defineTranslation('{count:plural}', {
        plural: {
          count: { one: '{?} l’a trouvée', other: '{?} l’ont trouvée' }
        }
      }),
      foundBy: 'Trouvée par {names}',
      nobody: 'Personne n’a écrit celle-là',
      title: 'La vérité, c’était'
    },
    scoring:
      'Chacun écrit une fausse réponse, puis la tablée vote sur le tout. 2 points pour trouver la vraie, et 1 de plus par joueur qui tombe dans la tienne.',
    tagline: 'Écris un mensonge. Fais mordre la table.',
    vote: {
      done: 'Ton vote est parti. On attend les autres…',
      duration: 'Temps pour voter',
      title: 'Laquelle est vraie ?',
      waiting: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} a voté', other: '{?} ont voté' } }
      }),
      yours: 'La tienne'
    },
    write: {
      description:
        'Quelque chose qu’ils croiront. La vraie réponse est refusée.',
      duration: 'Temps pour écrire',
      label: 'Ton mensonge',
      sent: 'Ton mensonge est parti. On attend les autres…',
      waiting: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} a écrit', other: '{?} ont écrit' } }
      })
    }
  },
  loading: 'Chargement…',
  menu: {
    build: 'Version {build}',
    home: 'Accueil',
    label: 'Menu',
    leaveRoom: 'Quitter la table'
  },
  navigation: {
    back: 'Retour à la taverne'
  },
  notFound: {
    description: 'La partie est finie, ou le code a été mal tapé.',
    title: 'La salle est vide'
  },
  player: {
    choosingGame: 'L’aubergiste choisit un jeu',
    final: {
      placing: 'Tu finis',
      rank: defineTranslation('{rank:plural}', {
        plural: {
          rank: {
            one: '{?}er',
            other: '{?}e',
            type: 'ordinal'
          }
        }
      })
    },
    midRound: {
      detail: 'Ta place est gardée — cette\u00a0tournée a commencé sans toi.',
      title: 'À la prochaine tournée'
    },
    nickname: {
      action: 'Prendre place',
      label: 'Pseudo',
      title: 'On t’appelle comment\u00a0?'
    },
    points: defineTranslation('{points:plural}', {
      plural: { points: { one: 'point', other: 'points' } }
    }),
    room: 'Table {code}',
    roomSize: '{count:number} à table',
    seating: 'On te trouve une place…',
    upNext: 'Tu vas jouer à',
    you: 'Toi'
  },
  preferences: {
    language: 'Langue',
    theme: {
      dark: 'Sombre',
      label: 'Thème',
      light: 'Clair',
      system: 'Système'
    }
  },
  quiz: {
    adult: {
      hint: 'Tu es le seul à savoir qui est à table.',
      label: 'Inclure les questions pour adultes'
    },
    category: {
      arts: 'Arts et culture',
      everyday: 'Vie quotidienne',
      geography: 'Géographie',
      history: 'Histoire',
      label: 'Sur quels sujets',
      none: 'N’en choisis aucun et tu as tous les sujets.',
      science: 'Sciences',
      sport: 'Sport'
    },
    duration: 'Temps par question',
    home: {
      description:
        'De l’histoire, des sciences, du sport, et des questions que personne ne voit venir. Tout le monde répond en même temps, et la bonne réponse la plus rapide rafle la tournée.'
    },
    language: 'Langue des questions',
    name: 'Quiz',
    reveal: {
      title: 'La réponse était'
    },
    scoring: {
      buzzer:
        'Le premier qui buzze répond à voix haute, et l’aubergiste dit si c’est bon. 1 point si c’est juste — et une mauvaise réponse te met hors-jeu pour le reste de la tournée.',
      choice:
        'Quatre propositions, et tout le monde répond en même temps. La bonne rapporte 1 point, et plus tu la trouves tôt, plus la montre ajoute — jusqu’à +3.',
      typed:
        'Tout le monde tape sa réponse en même temps. La bonne rapporte 3 points, et plus tu la trouves tôt, plus la montre ajoute — jusqu’à +3.'
    },
    tagline: 'Une question, et le premier qui sait.'
  },
  round: {
    answer: {
      correct: 'Tu l’as. Tranquille.',
      label: 'Ta réponse',
      locked: 'Réponse envoyée. On attend les autres…',
      retry: 'Autant d’essais que tu veux.',
      submit: 'Envoyer',
      waiting: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} a répondu', other: '{?} ont répondu' } }
      })
    },
    index: 'Tournée {index:number} sur {total:number}',
    indexOpen: 'Tournée {index:number}',
    nobody: 'Personne n’a trouvé',
    scored: '+{points:number}',
    speedBonus: 'dont {points:number} pour la vitesse'
  }
}
