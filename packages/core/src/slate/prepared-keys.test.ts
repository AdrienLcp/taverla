import { describe, expect, it } from 'vitest'

import { withPreparedKey } from './prepared-keys'

describe('withPreparedKey', () => {
  it('[prepared-keys] files a trimmed key at its item, leaving the gaps before it empty', () => {
    expect(
      withPreparedKey({ itemIndex: 2, key: ' Paprika ', keys: [] })
    ).toEqual([null, null, 'Paprika'])
  })

  it('[prepared-keys] shortens the key when its last entry is cleared', () => {
    const prepared = withPreparedKey({
      itemIndex: 3,
      key: 'Thym',
      keys: withPreparedKey({ itemIndex: 0, key: 'Sel', keys: [] })
    })

    expect(withPreparedKey({ itemIndex: 3, key: '', keys: prepared })).toEqual([
      'Sel'
    ])
  })
})
