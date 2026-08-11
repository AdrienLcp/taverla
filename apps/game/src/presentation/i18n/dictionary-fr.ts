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
      guess: 'Ta réponse',
      locked: 'Réponse envoyée. On attend les autres…',
      send: 'Envoyer',
      titleFound: 'Titre ✓',
      waiting: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} a répondu', other: '{?} ont répondu' } }
      })
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
    tagline: 'Tes questions, et une course honnête au buzz.',
    verdict: {
      right: 'Bonne réponse',
      wrong: 'Raté'
    }
  },
  connection: {
    clock: '· horloge ±{milliseconds:number} ms',
    closed: 'Reconnexion…',
    connecting: 'Connexion…',
    open: 'En direct',
    refused: 'Déconnecté'
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
    host_already_connected: 'Quelqu’un anime déjà ce salon.',
    host_only_action: 'Seul l’hôte peut faire ça.',
    internal_error: 'Quelque chose a cassé côté serveur.',
    invalid_message: 'Le serveur n’a pas compris ce message.',
    music_source_unavailable: 'Le service musical ne répond pas.',
    nickname_taken: 'Ce pseudo est déjà pris.',
    no_tracks_available: 'Il ne reste aucun titre à jouer.',
    not_implemented: 'Cette partie du jeu n’existe pas encore.',
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
      label: 'Temps pour répondre après un buzz',
      none: 'Tu décides'
    },
    autoAdvance: 'Enchaîner tout seul',
    changeSettings: 'Changer les réglages',
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
    game: 'Quel jeu',
    invite: {
      title: 'Scanne pour jouer'
    },
    joinLate: 'Encore ouvert',
    needsPlayer: 'Il faut au moins un joueur pour lancer',
    nextRound: 'Tour suivant',
    playAgain: 'Rejouer',
    players: {
      empty: 'Personne n’a encore rejoint. Le QR code attend.',
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
      taken: 'Tu joues sous le nom de {nickname}.'
    },
    seconds: '{seconds:number} s',
    seeResults: 'Voir les résultats',
    setup: {
      label: 'Réglages',
      roundInPlay: 'Certains de ces réglages attendent la fin de la manche'
    },
    startGame: 'Lancer la partie',
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
  menu: {
    build: 'Version {build}',
    home: 'Accueil',
    label: 'Menu'
  },
  notFound: {
    back: 'Retour au départ',
    description: 'La partie est finie, ou le code a été mal tapé.',
    title: 'Il n’y a rien ici'
  },
  player: {
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
  round: {
    index: 'Tour {index:number} sur {total:number}',
    indexOpen: 'Tour {index:number}',
    nobody: 'Personne n’a trouvé',
    scored: '+{points:number}'
  }
}
