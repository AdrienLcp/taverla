const STATUS_FAILURE = 'failure'
const STATUS_SUCCESS = 'success'
const UNKNOWN_ERROR = 'unknown'

type UnknownError = typeof UNKNOWN_ERROR

export type FailureResult<E = UnknownError> = {
  error: E
  status: typeof STATUS_FAILURE
}

type SuccessResult<T = void> = T extends void
  ? { status: typeof STATUS_SUCCESS }
  : { data: T; status: typeof STATUS_SUCCESS }

export type Result<T = void, E = UnknownError> =
  | FailureResult<E>
  | SuccessResult<T>

function success(): SuccessResult<void>
function success<T>(data: T): SuccessResult<T>
function success<T>(data?: T) {
  if (data === undefined) return { status: STATUS_SUCCESS }
  return { data, status: STATUS_SUCCESS }
}

function failure(): FailureResult<UnknownError>
function failure<const E>(error: E): FailureResult<E>
// The absent error is told from an explicit `undefined` by the argument count,
// never by comparing the value: `failure(undefined)` is typed
// `FailureResult<undefined>`, and answering `unknown` there returns something
// the signature says it will not.
function failure<const E>(...args: [] | [error: E]) {
  if (args.length === 0) return { error: UNKNOWN_ERROR, status: STATUS_FAILURE }
  return { error: args[0], status: STATUS_FAILURE }
}

export const Result = { failure, success }
