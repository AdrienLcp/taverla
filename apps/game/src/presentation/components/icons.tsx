import {
  BellRing,
  Check,
  ChevronDown,
  CircleQuestionMark,
  Copy,
  Lock,
  type LucideIcon,
  type LucideProps,
  Menu,
  Minus,
  Music,
  PencilLine,
  Plus,
  QrCode,
  Tv,
  X,
  Zap
} from 'lucide-react'
import type React from 'react'

import type { ShelvedGame } from '@taverla/protocol/game'

/**
 * The family every glyph is drawn in, so none arrives in someone else's
 * weight: `1.25em`, and 3.5 units of stroke on the 24-unit grid — the stem
 * weight of the display face's heaviest cut. Lucide's 2-unit round hairline
 * read as another product beside lettering this heavy. Butt caps and miter
 * joins because nothing here is round but the buzzer.
 *
 * Decorative: a glyph sits beside the word, or its control carries the name.
 */
const FAMILY = {
  'aria-hidden': true,
  focusable: false,
  size: '1.25em',
  strokeLinecap: 'butt',
  strokeLinejoin: 'miter',
  strokeWidth: 3.5
} as const satisfies LucideProps

const inFamily =
  (Glyph: LucideIcon, overrides: LucideProps = {}): React.FC<LucideProps> =>
  (props) => <Glyph {...FAMILY} {...overrides} {...props} />

export const CheckIcon = inFamily(Check)
export const ChevronIcon = inFamily(ChevronDown)
export const CopyIcon = inFamily(Copy)
export const CrossIcon = inFamily(X)
export const LockIcon = inFamily(Lock)
export const MenuIcon = inFamily(Menu, {
  className: 'menu-icon',
  strokeLinecap: 'round',
  strokeWidth: 2.6
})
export const MinusIcon = inFamily(Minus)
export const PlusIcon = inFamily(Plus)
export const QrCodeIcon = inFamily(QrCode)
export const ScreenIcon = inFamily(Tv)

const GAME_GLYPHS = {
  blindtest: Music,
  buzzer: BellRing,
  quiz: CircleQuestionMark,
  reflex: Zap,
  slate: PencilLine
} as const satisfies Record<ShelvedGame, LucideIcon>

type GameIconProps = {
  game: ShelvedGame
}

/**
 * What a game is, in one glyph: the same one on its spine and on its box. It
 * stands beside display lettering at 0.8em, where the family's 3.5 units close
 * up the question mark's counter.
 */
export const GameIcon: React.FC<GameIconProps> = ({ game }) => {
  const Glyph = GAME_GLYPHS[game]

  return <Glyph {...FAMILY} className='game-icon' strokeWidth={2.75} />
}
