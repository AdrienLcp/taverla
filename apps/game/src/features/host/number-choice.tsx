import type React from 'react'

import { SegmentedControl } from '@/presentation/components/segmented-control'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

/**
 * `0` stands for "no window", "no limit" and "the host says when": the strips
 * carry strings, and a segment whose value is the empty string is one a screen
 * reader announces as nothing.
 */
export const NO_LIMIT = 0

type NumberChoiceProps = {
  isDisabled: boolean
  label: string
  onChange: (value: number) => void
  /** How each option reads. `NO_LIMIT` arrives here like any other number. */
  optionLabel: (value: number) => string
  options: readonly number[]
  value: number
}

/**
 * A strip of numbers, which is most of what a host sets. react-aria addresses a
 * segment by string, so the number has to be found again on the way back up.
 */
export const NumberChoice: React.FC<NumberChoiceProps> = ({
  isDisabled,
  label,
  onChange,
  optionLabel,
  options,
  value
}) => (
  <SegmentedControl
    isDisabled={isDisabled}
    label={label}
    onChange={(next) => {
      const chosen = options.find((option) => String(option) === next)

      if (chosen !== undefined) {
        onChange(chosen)
      }
    }}
    options={options.map((option) => ({
      label: optionLabel(option),
      value: String(option)
    }))}
    value={String(value)}
  />
)

/**
 * The two ways a duration reads on a strip. `openEnded` is for the settings
 * whose `null` means the host is the clock — the segment says so in words
 * rather than showing a zero.
 */
export const useDurationLabels = (): {
  openEnded: (milliseconds: number) => string
  seconds: (milliseconds: number) => string
} => {
  const translate = useTranslate()

  const seconds = (milliseconds: number): string =>
    translate('host.seconds', { seconds: milliseconds / 1_000 })

  return {
    openEnded: (milliseconds: number): string =>
      milliseconds === NO_LIMIT
        ? translate('host.hostDecides')
        : seconds(milliseconds),
    seconds
  }
}
