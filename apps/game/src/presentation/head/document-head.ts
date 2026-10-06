import type { ShelvedGame } from '@taverla/protocol/game'
import type { Locale } from '@taverla/protocol/locale'

/**
 * A page served as its own document, one per language. Rooms are not here and
 * never will be: both are served `noindex`, they last one evening, and
 * there is no copy to write for a URL nobody reaches from outside the room.
 */
export type IndexedPage = 'credits' | 'home' | ShelvedGame

export type PageHead = {
  /** The search snippet, and the line a link unfurls with in a group chat. */
  description: string
  /** The browser tab, the search result, the unfurl. */
  title: string
}

/**
 * The one place a user-visible string lives outside the dictionary, and the
 * exception `.claude/rules/i18n.md` already carved for the document head: this
 * copy is read by somebody with no room in front of them, so it says what the
 * product is where the screen says what to do next. On the home page the screen
 * says `Taverla` and `The tavern is open.`, and neither is a search result.
 *
 * Read twice. Each page renders its title as `<title>`, which the build-time
 * prerender lifts into the head of fourteen documents beside the description it
 * writes itself, and React keeps in the tab after an in-app navigation. Typed over
 * `ShelvedGame`, so putting a game on the shelf stops compiling here until both
 * languages can introduce it to a stranger.
 */
export const PAGE_HEADS: Record<Locale, Record<IndexedPage, PageHead>> = {
  en: {
    blindtest: {
      description:
        'One screen plays the track and everyone else buzzes from whatever screen they have to hand. First to name the title and the artist takes the points. Scan the QR code and play — no install, no account.',
      title: 'Blind test — Taverla'
    },
    buzzer: {
      description:
        'A buzzer for the whole room and nothing else: you bring the charade, the quiz on paper or the lesson, and the screen settles who was first. Every buzz is stamped by the server, so the race cannot be argued with.',
      title: 'Buzzer — Taverla'
    },
    credits: {
      description:
        "Where Taverla's question banks come from, what was changed to bundle them, and the licence the assembled bank is shared under.",
      title: 'Credits — Taverla'
    },
    home: {
      description:
        'One screen runs the game, everyone joins by scanning a QR code or typing the room code — no install, no account. Blind test, Buzzer, Quiz, Reflex and Slate.',
      title: 'Taverla — party games for one screen and the whole room'
    },
    quiz: {
      description:
        'Thousands of questions across eight subjects, in French and in English, answered by the whole room at once on their own screens. Scan the QR code and play — no install, no account.',
      title: 'Quiz — Taverla'
    },
    reflex: {
      description:
        "The screen changes colour and the first in wins. Every device times the flip on its own clock, so the race measures a reflex and not the room's Wi-Fi. Going early costs the round.",
      title: 'Reflex — Taverla'
    },
    slate: {
      description:
        'Numbered things to guess and a private answer sheet on every screen. Nobody copies the loudest voice; the host marks the papers one number at a time on the big screen.',
      title: 'Slate — Taverla'
    }
  },
  fr: {
    blindtest: {
      description:
        "Un écran joue le morceau, tout le monde buzze depuis l'écran qu'il a sous la main. Le premier à donner le titre et l'artiste marque. Scannez le QR code et jouez — sans installation, sans compte.",
      title: 'Blind test — Taverla'
    },
    buzzer: {
      description:
        "Un buzzer pour toute la salle et rien d'autre : vous apportez la charade, le quiz sur papier ou la leçon, l'écran tranche qui a été le premier. Chaque buzz est horodaté par le serveur, la course ne se discute pas.",
      title: 'Buzzer — Taverla'
    },
    credits: {
      description:
        "D'où viennent les banques de questions de Taverla, ce qui a été modifié pour les embarquer, et sous quelle licence la banque assemblée est partagée.",
      title: 'Crédits — Taverla'
    },
    home: {
      description:
        'Un écran fait tourner le jeu, tout le monde rejoint en scannant un QR code ou en tapant le code de la salle — sans installation, sans compte. Blind test, Buzzer, Quiz, Réflexe et L’Ardoise.',
      title: 'Taverla — des jeux de soirée pour un écran et toute la salle'
    },
    quiz: {
      description:
        'Des milliers de questions sur six thèmes, en français et en anglais, auxquelles toute la salle répond en même temps depuis son écran. Scannez le QR code et jouez — sans installation, sans compte.',
      title: 'Quiz — Taverla'
    },
    reflex: {
      description:
        "L'écran change de couleur, le plus rapide gagne. Chaque appareil programme le basculement sur sa propre horloge : la course mesure un réflexe, pas le Wi-Fi de la salle. Partir trop tôt coûte la manche.",
      title: 'Réflexe — Taverla'
    },
    slate: {
      description:
        "Des choses numérotées à deviner et une feuille de réponses privée sur chaque écran. Personne ne copie la voix la plus forte ; l'hôte corrige les copies numéro par numéro sur le grand écran.",
      title: "L'Ardoise — Taverla"
    }
  }
}

/**
 * The share image is the same on every page, so its alt text belongs to the site
 * rather than to a page — but read out on a French unfurl it is the last English
 * string this stage would have left behind.
 */
export const IMAGE_ALTS: Record<Locale, string> = {
  en: "The Taverla wordmark on the lobby's burnt-orange field.",
  fr: 'Le nom Taverla sur un fond orange brûlé.'
}

/**
 * `og:locale` is specified as a POSIX-style tag with an underscore, not the
 * BCP-47 one `I18nProvider` hands react-aria. A crawler reading `en-US` here
 * treats the property as absent.
 */
export const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  en: 'en_US',
  fr: 'fr_FR'
}
