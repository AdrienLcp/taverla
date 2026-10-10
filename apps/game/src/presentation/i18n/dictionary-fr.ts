import { defineDictionary, defineTranslation } from '@adrienlcp/i18n'

/**
 * French typography puts a non-breaking space before `?`, `!` and `:`. Writing
 * it as \u00a0 keeps it visible to whoever edits this file, and survives an
 * editor that strips invisible characters.
 *
 * French counts 0 as singular. Every `one` form below therefore covers both 0
 * and 1, which is the whole reason these keys carry plural forms rather than a
 * word chosen at the call site.
 */
export const FR_DICTIONARY = defineDictionary({
  blindtest: {
    answer: {
      anyOrder:
        'Le titre, l’artiste, ou les deux — autant d’essais que tu veux.',
      anyOrderFilm:
        'Le film, le compositeur, ou les deux — autant d’essais que tu veux.',
      artistFound: 'Artiste ✓',
      bothFound: 'Tu as les deux. Tranquille.',
      composerFound: 'Compositeur ✓',
      filmFound: 'Film ✓',
      titleFound: 'Titre ✓'
    },
    audio: {
      refused: {
        blocked:
          'Le navigateur a refusé le son. Autorise-le pour ce site, ou tiens la table depuis un autre écran.',
        broken:
          'Ça a cassé de notre côté. Réessaie, ou tiens la table depuis un autre écran.',
        unsupported:
          'Cet écran ne sait pas lire l’extrait. Tiens la table depuis un autre écran.'
      },
      silent: 'Le son ne sort pas d’ici.',
      start: 'Lancer le son'
    },
    clip: 'Durée de l’extrait',
    decade: {
      '1970s': 'Années 70',
      '1980s': 'Années 80',
      '1990s': 'Années 90',
      '2000s': 'Années 2000',
      '2010s': 'Années 2010',
      '2020s': 'Années 2020',
      label: 'Quelles années',
      none: 'N’en choisis aucune et tu as toutes les décennies.'
    },
    difficulty: {
      label: 'À quel point c’est connu',
      mixed: 'Un peu pointu',
      obscure: 'Pour les experts',
      pinnedByFilms:
        'Les musiques de films fixent leur propre niveau — rien ici n’est un tube du top.',
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
        'Trois notes suffisent parfois, et toute la table cherche déjà. Titre, artiste, ou les deux : le plus rapide à savoir rafle la manche.'
    },
    listening: 'À l’écoute…',
    name: 'Blind test',
    reveal: {
      title: 'C’était'
    },
    scoring: {
      buzzer:
        'Le premier qui buzze répond à voix haute. L’hôte juge le titre et l’artiste, 1 point chacun — une mauvaise réponse te met hors-jeu pour le reste de la manche.',
      choice:
        'Quatre propositions sur le même extrait, et tout le monde répond. La bonne rapporte 1 point, et plus tu la trouves tôt, plus la montre ajoute — jusqu’au double.',
      typed:
        'Tout le monde tape, sur le même extrait. Titre et artiste rapportent 1 point chacun, les deux ensemble 3, et plus tu trouves tôt, plus la montre ajoute — jusqu’au double.'
    },
    scoringFilm: {
      buzzer:
        'Le premier qui buzze répond à voix haute. L’hôte juge le film et le compositeur, 1 point chacun — une mauvaise réponse te met hors-jeu pour le reste de la manche.',
      typed:
        'Tout le monde tape, sur le même extrait. Film et compositeur rapportent 1 point chacun, les deux ensemble 3, et plus tu trouves tôt, plus la montre ajoute — jusqu’au double.'
    },
    source: {
      chart: 'Le top du moment',
      decade: 'Une décennie',
      film: 'Musiques de films',
      filmHint:
        'Ce qu’un compositeur a écrit pour un film ou une série — pas les chansons de la bande originale.',
      label: 'D’où viennent les titres',
      noneInDecade:
        'Rien de jouable dans ces années-là. Essaie une autre décennie.',
      noneInFilms:
        'Rien de jouable n’est revenu des compositeurs. Essaie une autre source.',
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
      bothFilm: 'Film + compositeur',
      composerOnly: 'Compositeur seulement',
      filmOnly: 'Film seulement',
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
      you_already_missed: 'Tu es hors-jeu pour cette manche',
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
        'Les questions, c’est toi qui les apportes — une charade, un quiz sur une feuille, une leçon, ce que la table veut. Ici on ne tranche qu’une chose : qui a été le plus rapide. Et là-dessus, jamais de discussion.'
    },
    lockout: 'Une mauvaise réponse met hors-jeu',
    name: 'Buzzer',
    running: 'Pose ta question',
    scoring:
      'Le plus rapide répond à voix haute, et l’hôte dit si c’est bon. 1 point si c’est juste — et une mauvaise réponse te met hors-jeu jusqu’à ce qu’il te remette en jeu.',
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
    mintaka:
      'Elle fournit des questions et aucune mauvaise réponse : les trois propositions posées à côté de la bonne ont été construites ici, à partir d’entités que Wikidata range dans la même famille que la réponse et qu’on lit à peu près autant en français. Cinq de ses huit rubriques ont été retenues et rattachées aux huit sujets utilisés ici, ainsi que quatre de ses neuf formes de question — les autres nomment leurs propres propositions dans l’énoncé, acceptent plus de réponses qu’elles n’en enregistrent, ou demandent deux détours. Les questions qui nomment le présent ont été écartées, le corpus étant arrêté à octobre 2021. Parmi ce qui restait, seules celles dont la réponse et le sujet ont un article de Wikipédia en français réellement lu ont été gardées, et aucune réponse ne revient plus de cinq fois dans un même sujet.',
    openquizzdb:
      'Ses rubriques ont été rattachées aux huit sujets utilisés ici, ses anecdotes conservées comme la ligne affichée une fois la réponse dévoilée, et ses questions classées adulte signalées pour que l’hôte puisse les laisser de côté. Les questions qui ne portaient pas exactement trois mauvaises réponses ont été écartées, comme celles dont une mauvaise réponse ne se distingue plus de la bonne une fois écrite. Une réponse mal orthographiée par rapport à sa propre anecdote a été corrigée.',
    opentdb:
      'Son texte arrive encodé en HTML et a été décodé, ses catégories ont été rattachées aux huit sujets utilisés ici, et les questions qui ne portaient pas exactement trois mauvaises réponses ont été écartées, comme celles dont une mauvaise réponse ne se distingue plus de la bonne une fois écrite.',
    polyfact:
      'Elle est bâtie sur Wikidata en quatorze formes de question, dont sept ont été retenues et rattachées aux huit sujets utilisés ici — les autres portent sur des hameaux dont personne n’a entendu parler, ou donnent la réponse dans l’énoncé. Parmi ce qui restait, seules les questions dont le sujet et les quatre propositions ont tous un article de Wikipédia en français réellement lu ont été gardées. Une mauvaise réponse sur laquelle la source revenait bien trop souvent a été remplacée par une qu’elle n’utilisait presque pas, et les questions dont une mauvaise réponse ne se distingue plus de la bonne une fois écrite ont été écartées.',
    shareAlike:
      'La banque assemblée est diffusée sous la même licence, et le code qui l’assemble est ouvert.',
    title: 'Crédits',
    vikidia:
      'Ses quiz sont écrits en wikitexte et ont été relus ligne à ligne pour en tirer un énoncé, une réponse et trois mauvaises réponses. Chacune de ses pages a été rattachée à la main à l’un des huit sujets utilisés ici, puisqu’elle n’a pas de rubriques ; celles qui parlent du wiki lui-même ont été laissées de côté. Les questions qui ne portaient pas au moins quatre propositions, celles à plusieurs bonnes réponses et celles dont l’énoncé tient dans une formule mathématique, du code ou une image ont été écartées. Les modèles qui portaient une unité ou une citation ont été remplacés par ce qu’ils affichent. Chaque question retenue a été relue : les fausses ont été retirées, celles dont l’énoncé ne nommait plus son sujet ont été complétées, et celles qu’on ne peut gagner qu’en choisissant ont été signalées.',
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
        'On n’arrive pas à joindre Taverla. Réessaie dans un instant.'
    },
    false_start: 'Trop tôt. Attends que ça change.',
    host_already_connected: 'Quelqu’un tient déjà cette table.',
    host_away: 'L’hôte a décroché. La manche attend son retour.',
    host_only_action: 'Seul l’hôte peut faire ça.',
    host_reconnecting:
      'Cette table vient de perdre son hôte, et l’attend encore.',
    internal_error: 'Ça a cassé de notre côté. Réessaie.',
    invalid_message: 'On n’a pas compris. Réessaie.',
    joined_mid_round: 'Tu joues à partir de la prochaine manche.',
    music_source_unavailable:
      'La musique ne répond plus. Réessaie dans un instant.',
    nickname_taken: 'Ce pseudo est déjà pris.',
    no_content_available: 'Il ne reste rien à jouer. Change les réglages.',
    no_game_chosen: 'Choisis d’abord un jeu.',
    pairing_not_found:
      'Ce code d’écran a expiré. Rouvre l’écran pour en avoir un nouveau.',
    player_locked_out: 'Tu es hors-jeu pour cette manche.',
    protocol_version_mismatch: 'Cette page n’est plus à jour. Recharge-la.',
    rate_limited: 'Ça fait beaucoup de tables. Attends une minute et réessaie.',
    removed_by_host: 'L’hôte t’a retiré de la table.',
    room_closed: 'L’hôte a fermé la table.',
    room_full: 'Cette table est complète.',
    room_not_found: 'Aucune table sous ce code.',
    screen: {
      description:
        'Le jeu est tombé sur quelque chose dont il ne sait pas repartir. Recharger suffit presque toujours — et si le site a été mis à jour pendant que cet onglet était ouvert, toujours.',
      reload: 'Recharger la page',
      title: 'Quelque chose a cassé'
    },
    stale_round: 'Cette manche est déjà terminée.',
    wall_not_paired:
      'Cet écran n’est pas appairé. Appaire-le depuis l’appareil qui tient la table.',
    wrong_phase: 'Trop tard, la partie est passée à autre chose.'
  },
  home: {
    games: 'Les jeux',
    heldRooms: {
      host: 'Votre table',
      player: 'Votre place',
      title: 'Où vous étiez'
    },
    oneRoom:
      'Une seule table pour tous : on change de jeu sans rejoindre deux fois.',
    pitch: {
      lead: 'On joue en quelques secondes.',
      rest: 'Rien à installer, aucun compte : un code, un QR code, et toute la table est assise.'
    },
    promise: 'Une étagère de jeux pour toute la soirée.',
    title: 'Taverla'
  },
  host: {
    answered: defineTranslation('{count:plural} sur {total:number}', {
      plural: { count: { one: '{?} réponse', other: '{?} réponses' } }
    }),
    answerMode: {
      buzzer: 'Le premier qui buzze',
      choice: 'Quatre propositions',
      label: 'Comment on répond',
      typed: 'On tape'
    },
    answerWindow: {
      label: 'Temps pour répondre après un buzz'
    },
    autoAdvance: 'Temps avant la manche suivante',
    backToRoom: 'Retour à la table',
    closeRoom: {
      confirm: 'Oui, on ferme',
      label: 'Fermer la table',
      warning: 'Tout le monde sort, et le code cesse de fonctionner.'
    },
    countdown: 'Décompte',
    endGame: 'Terminer la partie',
    final: {
      nobody: 'Personne n’a marqué',
      tied: defineTranslation('{points:plural}', {
        plural: {
          points: {
            one: 'à égalité avec {?} point',
            other: 'à égalité avec {?} points'
          }
        }
      }),
      wins: defineTranslation('{points:plural}', {
        plural: {
          points: {
            one: 'gagne avec {?} point',
            other: 'gagne avec {?} points'
          }
        }
      })
    },
    game: {
      label: 'Quel jeu',
      prompt: 'Choisis-en un et la table est prête. Tu pourras changer d’avis.'
    },
    hostDecides: 'Tu décides',
    needsGame: 'Choisis à quoi la table joue',
    needsPlayer: 'Il faut au moins quelqu’un à table',
    nextRound: 'Manche suivante',
    playAgain: 'Rejouer',
    players: {
      empty: 'Encore personne. Ça ne va pas durer.',
      removeNamed: 'Retirer {nickname}',
      title: 'Les joueurs'
    },
    recovery: {
      action: 'Tenir la table d’ici',
      description: 'Il est dans le menu de l’hôte.',
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
        plural: { count: { one: '{?} manche', other: '{?} manches' } }
      })
    },
    rounds: 'Manches',
    seat: {
      action: 'Prendre place',
      cost: {
        hiddenAnswer: 'Tu ne verras plus la réponse avant les autres.',
        sharedScreen: 'Tu cours sur l’écran que toute la table regarde.'
      },
      judged:
        'Tu juges les buzz, donc pas de place ici. N’importe quelle autre façon de répondre t’en rend une.',
      label: 'Jouer aussi, sous le nom de',
      leave: 'Rendre sa place',
      taken: 'Tu joues sous le nom de {nickname}.'
    },
    seconds: '{seconds:number} s',
    seeResults: 'Voir les résultats',
    setup: {
      label: 'Réglages',
      roundInPlay: 'Les changements s’appliquent à la manche suivante',
      volume: 'Volume de cet écran'
    },
    standings: 'Classement',
    startGame: 'À table\u00a0!',
    verdict: {
      right: 'Bonne réponse',
      showAnswer: 'Voir la réponse',
      wrong: 'Raté'
    }
  },
  invite: {
    copied: 'Copié',
    copyCode: 'Copier le code',
    copyFailed: 'Copie impossible',
    documentTitle: 'Invitation — Taverla',
    door: {
      action: 'Afficher',
      description:
        'Ça ne donne rien : ni place, ni partie, ni la main sur la table. Ça montre ce que la table affiche déjà.',
      label: 'Afficher le code pour rejoindre',
      summary: 'Le code et le carré, sur un écran à part'
    },
    joinLate: 'Rejoins quand tu veux',
    project: 'Afficher le QR code en grand',
    title: 'Scanne pour jouer',
    typeIt: 'Tape-le pour rejoindre',
    unknown: {
      description:
        'Ce code n’ouvre aucune table. Elle a peut-être été fermée, ou le code mal lu.',
      title: 'Aucune table ici'
    }
  },
  join: {
    divider: 'ou',
    host: {
      action: 'Ouvrir une table',
      description:
        'C’est toi qui tiens la table. Les autres n’ont plus qu’à rejoindre.'
    },
    player: {
      action: 'Rejoindre',
      title: 'Rejoindre une table'
    },
    roomCode: {
      description: 'L’hôte l’a sous les yeux.',
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
  loading: 'Chargement…',
  menu: {
    build: 'Version {build}',
    home: 'Accueil',
    label: 'Menu',
    leaveRoom: 'Quitter la table',
    nickname: {
      action: 'Changer',
      field: 'Nouveau pseudo',
      label: 'Pseudo'
    }
  },
  navigation: {
    back: 'Retour aux jeux',
    skipToContent: 'Aller au contenu'
  },
  notFound: {
    description: 'La partie est finie, ou le code a été mal tapé.',
    documentTitle: 'Personne ici — Taverla',
    title: 'Personne ici'
  },
  player: {
    away: 'plus là',
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
      detail: 'Ta place est gardée — cette\u00a0manche a commencé sans toi.',
      title: 'À la prochaine manche'
    },
    nickname: {
      action: 'Rejoindre',
      label: 'Pseudo',
      title: 'On t’appelle comment\u00a0?'
    },
    points: defineTranslation('{points:plural}', {
      plural: { points: { one: 'point', other: 'points' } }
    }),
    room: 'Table {code}',
    roomSize: '{count:number} à table',
    score: '{points:number}',
    seating: 'On te trouve une place…',
    standing: {
      ofRoom: defineTranslation('{rank:plural} sur {count:number}', {
        plural: {
          rank: {
            one: '{?}er',
            other: '{?}e',
            type: 'ordinal'
          }
        }
      })
    },
    table: 'À la table',
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
    },
    volume: 'Volume'
  },
  quiz: {
    adult: {
      hint: 'Tu es le seul à savoir qui est à table.',
      label: 'Inclure les questions pour adultes'
    },
    category: {
      arts: 'Arts et culture',
      cinema: 'Cinéma',
      everyday: 'Quotidien',
      geography: 'Géographie',
      history: 'Histoire',
      label: 'Sur quels sujets',
      none: 'N’en choisis aucun et tu as tous les sujets.',
      science: 'Sciences',
      sport: 'Sport',
      videogames: 'Jeux vidéo'
    },
    duration: 'Temps par question',
    home: {
      description:
        'De l’histoire, des sciences, du sport, et des questions que personne ne voit venir. Tout le monde répond en même temps, et la bonne réponse la plus rapide rafle la manche.'
    },
    language: 'Langue des questions',
    name: 'Quiz',
    reveal: {
      title: 'La réponse était'
    },
    scoring: {
      buzzer:
        'Le premier qui buzze répond à voix haute, et l’hôte dit si c’est bon. 1 point si c’est juste — et une mauvaise réponse te met hors-jeu pour le reste de la manche.',
      choice:
        'Quatre propositions, et tout le monde répond en même temps. La bonne rapporte 1 point, et plus tu la trouves tôt, plus la montre ajoute — jusqu’au double.',
      typed:
        'Tout le monde tape sa réponse en même temps. La bonne rapporte 3 points, et plus tu la trouves tôt, plus la montre ajoute — jusqu’au double.'
    },
    tagline: 'Une question, et le premier qui sait.',
    wellKnown: {
      hint: 'Il y en a moins à tirer, mais personne ne sèche.',
      label: 'Rester grand public'
    }
  },
  reflex: {
    falseStart: {
      detail: 'Celle-là, tu la regardes depuis le banc.',
      title: 'Parti avant que l’écran change.'
    },
    flip: 'VAS-Y',
    hold: 'Appuie avant qu’il change et tu passes la manche.',
    home: {
      description:
        'Rien à savoir, rien à dire. L’écran reste immobile, puis il change — et le plus rapide rafle la manche. Pars avant qu’il change et celle-là, tu la regardes depuis le banc.'
    },
    landed: defineTranslation('{count:plural}', {
      plural: {
        count: { one: '{?} joueur a appuyé', other: '{?} joueurs ont appuyé' }
      }
    }),
    name: 'Réflexe',
    nobody: 'Personne n’a bougé',
    pressed: 'C’est pris.',
    reaction: '{milliseconds:number} ms',
    scoring:
      'L’écran change, et le plus rapide prend le point. Pars avant qu’il change et tu passes la manche sur le banc.',
    tagline: 'L’écran change. Le plus rapide gagne.',
    tooEarly: 'parti trop tôt',
    waiting: 'Guette l’écran.'
  },
  room: {
    documentTitle: '{game} — Taverla',
    documentTitleLobby: 'Taverla'
  },
  round: {
    answer: {
      correct: 'Tu l’as. Tranquille.',
      label: 'Ta réponse',
      missed: 'Pas celle-là.',
      retry: 'Autant d’essais que tu veux.',
      submit: 'Envoyer',
      waiting: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} a répondu', other: '{?} ont répondu' } }
      })
    },
    award: '{points:number}',
    awardWithSpeed: '{answer:number} +{speed:number}',
    index: 'Manche {index:number} sur {total:number}',
    indexOpen: 'Manche {index:number}',
    missed: 'Rien cette fois.',
    nobody: 'Personne n’a trouvé',
    scored: '+{points:number}',
    speedBonus: 'dont {points:number} pour la vitesse'
  },
  slate: {
    board: {
      close: 'Ramasser',
      closeItem: 'Ramasser {item} et le corriger maintenant',
      markItem: 'Corriger {item}',
      sheets: 'Les feuilles',
      show: 'Corriger',
      state: {
        closed: 'À corriger',
        marked: 'Corrigé',
        open: '{filled:number}/{count:number} écrits'
      }
    },
    correct: {
      blanks: 'Rien écrit : {names}',
      finish: 'Voir les scores',
      judge: 'Juste',
      key: {
        reveal: 'Dévoiler la réponse',
        title: 'La réponse'
      },
      next: 'Suivant',
      nobody: 'Personne n’a rien écrit pour celui-là.',
      previous: 'Précédent'
    },
    home: {
      description:
        'Des choses numérotées à deviner — des verres à goûter, des photos, des prix — et chacun écrit sur une feuille que personne ne voit, dans l’ordre qu’il veut. Puis l’hôte corrige les copies numéro par numéro, et chaque réponse qu’il accepte vaut un point.'
    },
    item: 'N° {index:number}',
    itemOf: 'N° {index:number} sur {count:number}',
    items: {
      add: 'Un de plus',
      label: 'Choses à deviner',
      summary: defineTranslation('{count:plural}', {
        plural: {
          count: { one: '{?} chose à deviner', other: '{?} choses à deviner' }
        }
      })
    },
    key: {
      field: 'Réponse pour {item}',
      hint: 'Gardé sur cet écran et envoyé à l’ouverture des feuilles. Les joueurs ne voient une réponse que quand vous la dévoilez.',
      label: 'Corrigé',
      summary: defineTranslation('{count:plural}', {
        plural: {
          count: { one: 'Caché · {?} noté', other: 'Caché · {?} notés' }
        }
      })
    },
    labels: {
      duplicate: 'Une autre case affiche déjà ça.',
      hint: 'Laisse une case vide pour garder son numéro. Une lettre, un emoji ou un mot court, tout marche.',
      label: 'Noms des choses à deviner',
      none: 'Numérotées 1, 2, 3…',
      some: defineTranslation('{count:plural}', {
        plural: { count: { one: '{?} nommée', other: '{?} nommées' } }
      })
    },
    marking: {
      now: 'En correction'
    },
    name: 'L’Ardoise',
    prepare: {
      keys: defineTranslation('{count:plural}', {
        plural: {
          count: { one: '{?} réponse notée', other: '{?} réponses notées' }
        }
      }),
      title: 'Préparer la feuille'
    },
    progress: '{filled:number}/{count:number}',
    scoring:
      'Chacun remplit sa feuille sans rien montrer, puis l’hôte corrige : un point par réponse qu’il accepte.',
    sheet: {
      blank: 'Rien écrit',
      closedBeforeYou: 'Ramassé avant ton arrivée',
      field: 'Ta réponse pour {item}',
      grid: 'Ta feuille',
      key: 'Réponse : {key}',
      next: 'Suivant',
      previous: 'Précédent',
      saved:
        'Enregistré au fil de l’eau. Tu peux changer une réponse jusqu’à ce que l’hôte la ramasse.',
      tile: {
        empty: '{item}, vide',
        filled: '{item} : {answer}',
        locked: '{item}, ramassé'
      }
    },
    tagline: 'Chacun écrit. Personne ne copie.',
    verdict: {
      pending: 'L’hôte corrige…',
      right: 'Accepté',
      wrong: 'Pas cette fois'
    },
    wall: {
      allCollected: 'Tout est ramassé.',
      collect: 'Ramasser les feuilles',
      collectRest: 'Ramasser le reste',
      filling:
        'Les feuilles sont ouvertes. Écrivez ce que vous pensez de chacun.',
      toList: 'Revenir à la liste',
      toSheets: 'Revenir aux feuilles',
      toWall: 'Reprendre la correction'
    },
    yourAnswer: 'Tu as écrit',
    yourSheet: 'Toute ta feuille'
  },
  wall: {
    door: {
      action: 'Afficher la partie ici',
      description:
        'Pour l’écran que toute la table voit. Il affiche un code, l’hôte le confirme, et la partie apparaît ici — sans les réponses et sans rien à presser.',
      label: 'Afficher la partie sur cet écran',
      summary: 'La partie en grand, sans rien à tenir'
    },
    hostAway: {
      takeOver: 'Tenir la table d’ici',
      title: 'L’hôte a décroché. La partie attend son retour.'
    },
    menu: {
      description:
        'Ouvre la table sur un autre écran, puis tape le code qu’il affiche.',
      failed: 'Ce code n’affiche rien. L’écran en montre peut-être un nouveau.',
      label: 'Code de l’écran',
      openHere: 'Afficher la partie dans un nouvel onglet',
      pair: 'Y afficher la table',
      paired: 'C’est fait : la table est sur cet écran.'
    },
    pair: {
      backToTable: 'Retour à ma table',
      description:
        'L’écran qui affiche {code} montrera ta table, sans les réponses et sans rien à presser.',
      documentTitle: 'Afficher une table — Taverla',
      done: 'Ta table est sur cet écran.',
      failed:
        'Ça n’est pas passé. Le code a peut-être expiré — l’écran en affiche un nouveau.',
      nothingHeld: {
        description:
          'Seul l’écran qui tient une table peut l’afficher ailleurs. Scanne le carré depuis celui-là.',
        title: 'Aucune table à afficher'
      },
      show: 'Afficher la table {room}',
      title: 'Afficher ta table sur cet écran-là ?'
    },
    pairAgain: 'Appairer cet écran',
    pairing: {
      caption: 'Scanne depuis l’écran qui tient la table',
      codeCaption: 'Ou tape ce code dans son menu',
      documentTitle: 'En attente d’une table — Taverla',
      failed: 'On n’arrive pas à joindre Taverla pour avoir un code.',
      retry: 'Réessayer',
      title: 'Cet écran attend sa table'
    },
    sound: 'Mettre le son'
  }
})
