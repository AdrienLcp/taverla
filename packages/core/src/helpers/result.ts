export type Result<TData, TError> =
  | { data: TData; status: 'success' }
  | { error: TError; status: 'failure' }

const success = <TData>(data: TData): Result<TData, never> => ({
  data,
  status: 'success'
})

const failure = <TError>(error: TError): Result<never, TError> => ({
  error,
  status: 'failure'
})

/**
 * Both the type and its constructors under one name, so a call site needs a
 * single import to declare a `Result<T, E>` and to build one.
 */
export const Result = { failure, success }
