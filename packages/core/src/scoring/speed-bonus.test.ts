import { describe, expect, it } from 'vitest'

import { MOST_A_SPEED_BONUS_PAYS, POINT } from '@taverla/protocol/scoring'

import { speedBonusForElapsed } from './speed-bonus'

const THIRTY_SECONDS = 30_000
const A_TYPED_ANSWER = 3 * POINT
const A_RIGHT_PICK = POINT

const paidAt = (elapsedMs: number, roundDurationMs = THIRTY_SECONDS): number =>
  speedBonusForElapsed({
    answerPaid: A_TYPED_ANSWER,
    elapsedMs,
    roundDurationMs
  })

describe('speedBonusForElapsed', () => {
  it('[scoring] pays the whole bonus at the start and nothing at the end', () => {
    expect(paidAt(0)).toBe(MOST_A_SPEED_BONUS_PAYS)
    expect(paidAt(THIRTY_SECONDS)).toBe(0)
  })

  /**
   * The case the rank table could not price, and the reason it went: one second
   * against twenty-nine used to be worth 2 against 1.
   */
  it('[scoring] separates one second from twenty-nine', () => {
    expect(paidAt(1_000)).toBe(2_900)
    expect(paidAt(29_000)).toBe(100)
  })

  it('[scoring] falls with the clock rather than with the order', () => {
    expect(paidAt(THIRTY_SECONDS / 4)).toBe(2_250)
    expect(paidAt(THIRTY_SECONDS / 2)).toBe(1_500)
    expect(paidAt((THIRTY_SECONDS * 3) / 4)).toBe(750)
  })

  /**
   * Three quick players inside one second, which whole points used to pay the
   * same: the first of them has to come out ahead.
   */
  it('[scoring] separates three answers inside the same second, the first highest', () => {
    const [first, second, third] = [8_100, 8_150, 8_900].map((elapsedMs) =>
      paidAt(elapsedMs)
    )

    expect(first).toBeGreaterThan(second ?? 0)
    expect(second).toBeGreaterThan(third ?? 0)
  })

  /**
   * The bare buzzer has no round clock — the host brings the content, so there
   * is no denominator and nothing to be late against.
   */
  it('[scoring] pays nothing where there is no clock to be measured on', () => {
    expect(
      speedBonusForElapsed({
        answerPaid: A_TYPED_ANSWER,
        elapsedMs: 1_000,
        roundDurationMs: null
      })
    ).toBe(0)
    expect(
      speedBonusForElapsed({
        answerPaid: A_TYPED_ANSWER,
        elapsedMs: 1_000,
        roundDurationMs: 0
      })
    ).toBe(0)
  })

  /**
   * A round the server settles a beat after its own deadline, and a clock held
   * so long that the elapsed count outruns the duration. Neither may pay a
   * negative bonus, which would take back a point the answer earned.
   */
  it('[scoring] never pays less than nothing past the deadline', () => {
    expect(paidAt(THIRTY_SECONDS + 5_000)).toBe(0)
  })

  /**
   * The rule a room has to be able to say out loud: being fast doubles what the
   * answer paid, and never more. A pick worth one used to be worth four to
   * whoever hit it first, which put speed at three times being right.
   */
  it('[scoring] never pays more than the answer itself did', () => {
    const pick = (elapsedMs: number): number =>
      speedBonusForElapsed({
        answerPaid: A_RIGHT_PICK,
        elapsedMs,
        roundDurationMs: THIRTY_SECONDS
      })

    expect(pick(0)).toBe(A_RIGHT_PICK)
    expect(pick(1_000)).toBeLessThan(A_RIGHT_PICK)
    expect(pick(THIRTY_SECONDS)).toBe(0)
  })

  /**
   * Half a blind test answer is worth one, so it buys one, where holding both
   * halves buys three — a fast half must not outscore a slow whole.
   */
  it('[scoring] leaves a fast half below a whole answer', () => {
    const half = speedBonusForElapsed({
      answerPaid: POINT,
      elapsedMs: 0,
      roundDurationMs: THIRTY_SECONDS
    })

    expect(POINT + half).toBeLessThan(A_TYPED_ANSWER)
  })

  /** An answer that paid nothing is never asked, and would buy nothing anyway. */
  it('[scoring] pays nothing on top of nothing', () => {
    expect(
      speedBonusForElapsed({
        answerPaid: 0,
        elapsedMs: 0,
        roundDurationMs: THIRTY_SECONDS
      })
    ).toBe(0)
  })
})
