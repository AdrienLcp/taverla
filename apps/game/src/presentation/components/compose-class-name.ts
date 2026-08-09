import {
  type ClassNameOrFunction,
  composeRenderProps
} from 'react-aria-components'

/**
 * react-aria lets `className` be a function of the component's render state, so
 * the merge is a function too. It therefore fits a react-aria component and
 * never a plain DOM element, where a template literal is the answer.
 */
export const composeClassName = <TRenderProps>(
  incoming: ClassNameOrFunction<TRenderProps> | undefined,
  ...ownClassNames: (string | false | undefined)[]
): ((
  values: TRenderProps & { defaultClassName: string | undefined }
) => string) =>
  composeRenderProps(incoming, (resolved) =>
    [...ownClassNames, resolved].filter(Boolean).join(' ')
  )
