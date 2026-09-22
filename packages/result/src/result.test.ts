import { describe, expect, expectTypeOf, it } from 'vitest'

import { Result } from './result'

describe('Result.success', () => {
  it('[result] carries no data when called with none', () => {
    expect(Result.success()).toEqual({ status: 'success' })
  })

  it('[result] carries whatever it is given', () => {
    expect(Result.success({ id: '1' })).toEqual({
      data: { id: '1' },
      status: 'success'
    })
  })

  it.each([
    ['', 'the empty string'],
    [0, 'zero'],
    [false, 'false'],
    [null, 'null']
  ])(
    '[result] keeps %j (%s) as data rather than reading it as absent',
    (data, _description) => {
      expect(
        Result.success(data),
        'only `undefined` means "no data" — a falsy value is a value'
      ).toEqual({ data, status: 'success' })
    }
  )
})

describe('Result.failure', () => {
  it('[result] defaults to the unknown error', () => {
    expect(Result.failure()).toEqual({ error: 'unknown', status: 'failure' })
  })

  it('[result] carries a domain error code', () => {
    expect(Result.failure('optimistic_lock')).toEqual({
      error: 'optimistic_lock',
      status: 'failure'
    })
  })

  it('[result] carries an explicit undefined rather than swapping in unknown', () => {
    expect(
      Result.failure(undefined),
      'the signature promises FailureResult<undefined>; reading the argument as absent would make that a lie'
    ).toEqual({ error: undefined, status: 'failure' })
  })

  it('[result] carries a structured error', () => {
    expect(Result.failure({ code: 'forbidden', field: 'role' })).toEqual({
      error: { code: 'forbidden', field: 'role' },
      status: 'failure'
    })
  })
})

describe('the type of a success', () => {
  // Signature-only: the body never applied `NonNullable`, so putting it back
  // narrows in silence — every call site stays assignable and every runtime
  // assertion here passes either way.
  it('[result] keeps the nullability of what it was given', () => {
    expectTypeOf(Result.success<string | null>(null).data).toEqualTypeOf<
      string | null
    >()
  })
})

describe('the two statuses', () => {
  // The repo settled on 'failure', never 'error' — a mismatch here would make
  // every `result.status === 'failure'` check silently fall through to success.
  it('[result] are exactly "success" and "failure"', () => {
    expect(Result.success().status).toBe('success')
    expect(Result.failure().status).toBe('failure')
  })

  it('[result] narrow a result to one branch or the other', () => {
    const results = [Result.success(42), Result.failure('nope')]

    const readable = results.map((result) =>
      result.status === 'success' ? result.data : result.error
    )

    expect(readable).toEqual([42, 'nope'])
  })
})
