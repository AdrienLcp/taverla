import { ProjectWithCode } from '@/features/invite/project-with-code'
import { JoinWithCode } from '@/features/join/join-with-code'
import { WallDoor } from '@/features/wall/wall-door'
import { Button } from '@/presentation/components/button'
import { PAGE_HEADS } from '@/presentation/head/document-head'
import { DocumentTitle } from '@/presentation/head/document-title'
import { useI18n, useTranslate } from '@/presentation/i18n/i18n-provider'

import { GameSpines } from './game-spines'
import { HeldRooms } from './held-rooms'
import { useCreateRoom } from './use-create-room'

import './home-page.sass'
import { Main } from '@/presentation/components/main'

/**
 * The product's front door, and the one screen that belongs to no game: the
 * lid of the box beside the shelf it came off. The lid holds the two promises
 * together — the room is playing in seconds, and there is a whole evening on
 * the shelf — and the two doors under them. The room comes first: the code
 * goes up, the players arrive, and the table decides what to play while they
 * do, which is why opening one here asks nothing and the shelf is a shortcut
 * rather than the only way through.
 */
export const HomePage: React.FC = () => {
  const { locale } = useI18n()
  const translate = useTranslate()
  const createRoom = useCreateRoom()
  const { isOpening, open, refusal } = createRoom

  return (
    <Main className='home-page'>
      <DocumentTitle>{PAGE_HEADS[locale].home.title}</DocumentTitle>

      <div className='door-side'>
        <section className='lid'>
          <p className='wordmark'>
            {translate('home.title')}
            <span aria-hidden='true' className='dot'>
              .
            </span>
          </p>
          <h1>{translate('home.promise')}</h1>
          <p className='pitch'>
            <strong>{translate('home.pitch.lead')}</strong>{' '}
            {translate('home.pitch.rest')}
          </p>

          <div className='doors'>
            <div className='open'>
              <Button
                isPending={isOpening(null)}
                onPress={() => {
                  void open(null)
                }}
                size='large'
              >
                {translate('join.host.action')}
              </Button>
              {refusal?.door === null && (
                <p className='error' role='alert'>
                  {translate(refusal.error)}
                </p>
              )}
            </div>
            <JoinWithCode />
          </div>
        </section>

        {/*
          Under the lid rather than in it, and the reason is a measurement: the
          section is drawn only once the server has said which remembered rooms
          still resolve, so it *arrives*, and above the doors it moved the one a
          press aims at by 221px. A first-time visitor holds no key and sees no
          section at all.
        */}
        <HeldRooms />
      </div>

      <GameSpines createRoom={createRoom} />

      {/*
        Folded and last: rare jobs beside the two doors, and neither is a way
        into a room — one shows a table and runs nothing.
      */}
      <div className='more'>
        <WallDoor />
        <ProjectWithCode />
      </div>
    </Main>
  )
}
