import { useParams as useReactRouterParams } from 'react-router'

export const params = {
  game: 'game',
  roomCode: 'roomCode'
} as const

// Mieux typer ça
// https://reactrouter.com/api/hooks/useParams
export const useParams = useReactRouterParams<keyof typeof params>
