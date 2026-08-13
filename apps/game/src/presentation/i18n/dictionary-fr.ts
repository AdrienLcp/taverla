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
        'Un écran joue le morceau et affiche le QR code. Tout le monde répond sur ce qu’il a dans la main, et le premier qui sait remporte le tour.'
    },
    listening: 'À l’écoute…',
    name: 'Blind test',
    reveal: {
      title: 'C’était'
    },
    scoring: {
      buzzer:
        'Le premier qui buzze répond à voix haute. L’hôte juge le titre et l’artiste, 1 point chacun — une mauvaise réponse te met hors-jeu pour le reste du tour.',
      choice:
        'Tout le monde choisit, sur le même extrait. La bonne proposition rapporte 1 point, et les deux premiers à la trouver gagnent +2 et +1 en plus.',
      typed:
        'Tout le monde tape, sur le même extrait. Titre et artiste rapportent 1 point chacun, les deux ensemble 3, et les deux premiers à trouver gagnent +2 et +1 en plus.'
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
      host_away: 'L’hôte a décroché. Tout est en pause.',
      round_not_running: 'En attente de l’hôte',
      someone_else_buzzed: 'Quelqu’un a été plus rapide',
      you_already_missed: 'Tu es hors-jeu pour ce tour',
      your_answer_is_pending: 'Donne ta réponse à voix haute'
    },
    ready: 'Appuie dès que tu sais',
    sendFailed: 'Ce buzz n’est pas parti. Réappuie.',
    theyBuzzed: '{nickname} a buzzé',
    won: 'C’est à toi. Annonce\u00a0!'
  },
  buzzer: {
    clearLockouts: 'Remettre tout le monde en jeu',
    home: {
      description:
        'Les questions, c’est toi qui les apportes — une charade, un quiz sur une feuille, une leçon, ce que la salle veut. Cet écran décide seulement qui a posé le pouce en premier, et ça, il ne se trompe jamais.'
    },
    lockout: 'Une mauvaise réponse met hors-jeu',
    name: 'Buzzer',
    running: 'Pose ta question',
    scoring:
      'Le premier pouce répond à voix haute, et l’hôte dit si c’est bon. 1 point si c’est juste — et une mauvaise réponse te met hors-jeu jusqu’à ce que l’hôte te remette en jeu.',
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
      'Ses rubriques ont été rattachées aux six sujets utilisés ici, ses anecdotes conservées comme la ligne affichée une fois la réponse dévoilée, et ses questions classées adulte signalées pour qu’un hôte puisse les laisser de côté. Les questions qui ne portaient pas exactement trois mauvaises réponses ont été écartées.',
    opentdb:
      'Son texte arrive encodé en HTML et a été décodé, ses catégories ont été rattachées aux six sujets utilisés ici, et les questions qui ne portaient pas exactement trois mauvaises réponses ont été écartées.',
    shareAlike:
      'La banque assemblée est diffusée sous la même licence, et le code qui l’assemble est ouvert.',
    title: 'Crédits',
    whatChanged: 'Ce qu’on a changé'
  },
  error: {
    already_buzzed: 'Quelqu’un a été plus rapide.',
    api: {
      rate_limited:
        'Ça fait beaucoup de salons. Attends une minute et réessaie.',
      rejected: 'Le serveur a refusé la demande.',
      unexpected_response: 'Le serveur a répondu quelque chose d’inattendu.',
      unreachable: 'Serveur injoignable. Réessaie dans un instant.'
    },
    cannot_vote_for_own_lie: 'Celle-là est la tienne. Choisis-en une autre.',
    host_already_connected: 'Quelqu’un anime déjà ce salon.',
    host_only_action: 'Seul l’hôte peut faire ça.',
    internal_error: 'Quelque chose a cassé côté serveur.',
    invalid_message: 'Le serveur n’a pas compris ce message.',
    joined_mid_round: 'Tu joues à partir du prochain tour.',
    lie_is_the_answer: 'C’est la vraie réponse. Invente autre chose.',
    music_source_unavailable: 'Le service musical ne répond pas.',
    nickname_taken: 'Ce pseudo est déjà pris.',
    no_content_available: 'Il ne reste rien à jouer. Change les réglages.',
    no_game_chosen: 'Choisis d’abord un jeu.',
    player_locked_out: 'Tu es hors-jeu pour ce tour.',
    protocol_version_mismatch: 'Cette page n’est plus à jour. Recharge-la.',
    rate_limited: 'Ça fait beaucoup de salons. Attends une minute et réessaie.',
    room_closed: 'L’hôte a fermé le salon.',
    room_full: 'Ce salon est complet.',
    room_not_found: 'Ce salon n’existe pas.',
    screen: {
      description:
        'Le jeu est tombé sur quelque chose dont il ne sait pas repartir. Recharger suffit presque toujours — et si le site a été mis à jour pendant que cet onglet était ouvert, toujours.',
      reload: 'Recharger la page',
      title: 'Quelque chose a cassé'
    },
    stale_round: 'Ce tour est déjà terminé.',
    wrong_phase: 'Trop tard, la partie est passée à autre chose.'
  },
  home: {
    games: 'Les jeux',
    tagline:
      'Des jeux de soirée pour un écran et les téléphones de tout le monde.',
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
    backToRoom: 'Retour au salon',
    closeRoom: {
      confirm: 'Oui, fermer',
      label: 'Fermer le salon',
      warning:
        'Tout le monde sera déconnecté, et le code cessera de fonctionner.'
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
      prompt: 'Choisis-en un et le salon est prêt. Tu pourras changer d’avis.'
    },
    hostDecides: 'Tu décides',
    invite: {
      title: 'Scanne pour jouer'
    },
    joinLate: 'Encore ouvert',
    needsGame: 'Choisis à quoi le salon joue',
    needsPlayer: 'Il faut au moins un joueur pour lancer',
    nextRound: 'Tour suivant',
    playAgain: 'Rejouer',
    players: {
      empty: 'Personne n’a encore rejoint. Le QR code attend.',
      remove: 'Retirer',
      removeNamed: 'Retirer {nickname}',
      title: 'Joueurs'
    },
    reveal: 'Donner la réponse',
    roundCount: {
      open: 'Sans fin',
      openSummary: 'Jusqu’à ce que tu arrêtes',
      summary: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} tour', other: '{?} tours' } }
      })
    },
    rounds: 'Tours',
    seat: {
      action: 'Prendre une place',
      description: 'Cet écran cesse de recevoir la réponse jusqu’au reveal.',
      label: 'Jouer aussi, sous le nom de',
      leave: 'Rendre sa place',
      taken: 'Tu joues sous le nom de {nickname}.'
    },
    seconds: '{seconds:number} s',
    seeResults: 'Voir les résultats',
    setup: {
      label: 'Réglages',
      roundInPlay: 'Certains de ces réglages attendent la fin de la manche'
    },
    startGame: 'Lancer la partie',
    verdict: {
      right: 'Bonne réponse',
      wrong: 'Raté'
    },
    volume: 'Volume'
  },
  join: {
    divider: 'ou',
    host: {
      action: 'Créer un salon',
      description: 'Ouvre la console avec le QR code que tes amis scannent.'
    },
    player: {
      action: 'Rejoindre',
      title: 'Rejoindre une partie'
    },
    roomCode: {
      description: 'Affiché sur l’écran de l’hôte.',
      label: 'Code du salon',
      unknown: 'Aucune partie ne tourne sous ce code.',
      unsupportedCharacters:
        'Un code de salon ne contient jamais {characters}.',
      wrongLength: defineTranslation('{length:plural}', {
        plural: {
          length: {
            one: 'Un code de salon fait {?} caractère.',
            other: 'Un code de salon fait {?} caractères.'
          }
        }
      })
    }
  },
  lefake: {
    home: {
      description:
        'Un écran pose une question dont personne ne voit venir la réponse. Chacun en invente une fausse mais crédible, l’écran les affiche toutes à côté de la vraie, et la salle vote. Tu marques en trouvant la vraie — et à chaque joueur qui tombe dans la tienne.'
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
      found: defineTranslation('{count:plural}', {
        plural: {
          count: { one: '{?} l’a trouvée', other: '{?} l’ont trouvée' }
        }
      }),
      nobody: 'Personne n’a écrit celle-là',
      title: 'La vérité, c’était'
    },
    scoring:
      'Chacun écrit une fausse réponse, puis la salle vote sur le tout. 2 points pour trouver la vraie, et 1 de plus par joueur qui tombe dans la tienne.',
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
    leaveRoom: 'Quitter le salon'
  },
  notFound: {
    back: 'Retour au départ',
    description: 'La partie est finie, ou le code a été mal tapé.',
    title: 'Il n’y a rien ici'
  },
  player: {
    choosingGame: 'L’hôte choisit un jeu',
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
      detail: 'Ta place est gardée — ce\u00a0tour a commencé sans toi.',
      title: 'Au prochain tour'
    },
    nickname: {
      action: 'Rejoindre la partie',
      label: 'Pseudo',
      title: 'On t’appelle comment\u00a0?'
    },
    points: defineTranslation('{points:plural}', {
      plural: { points: { one: 'point', other: 'points' } }
    }),
    room: 'Salon {code}',
    roomSize: '{count:number} dans le salon',
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
      hint: 'Tu es le seul à savoir qui est dans la salle.',
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
        'Des questions sur tout — l’histoire, les sciences, le sport, la vie de tous les jours. Un écran pose la question, tout le monde répond sur ce qu’il a dans la main, et la bonne réponse la plus rapide remporte le tour.'
    },
    language: 'Langue des questions',
    name: 'Quiz',
    reveal: {
      title: 'La réponse était'
    },
    scoring: {
      buzzer:
        'Le premier qui buzze répond à voix haute, et l’hôte dit si c’est bon. 1 point si c’est juste — et une mauvaise réponse te met hors-jeu pour le reste du tour.',
      choice:
        'Tout le monde choisit parmi quatre, contre la montre. La bonne proposition rapporte 1 point, et les deux premiers à la trouver gagnent +2 et +1 en plus.',
      typed:
        'Tout le monde tape, contre la montre. La bonne réponse rapporte 3 points, et les deux premiers à trouver gagnent +2 et +1 en plus.'
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
    index: 'Tour {index:number} sur {total:number}',
    indexOpen: 'Tour {index:number}',
    nobody: 'Personne n’a trouvé',
    scored: '+{points:number}'
  }
}
