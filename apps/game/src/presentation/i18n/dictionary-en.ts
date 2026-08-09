/**
 * The reference dictionary: its keys are the type every other locale is checked
 * against, so a string added here does not compile until every locale has it.
 *
 * `blindtest.*` is the one namespace that belongs to a single game. Everything
 * else — joining a room, the roster, the connection, the errors — is the shell
 * that the next game will reuse. See `docs/game-catalogue.md`.
 */
export const EN_DICTIONARY = {
  'blindtest.buzz.action': 'Buzz',
  'blindtest.buzz.blocked.round_not_running': 'Waiting for the host',
  'blindtest.buzz.blocked.someone_else_buzzed': 'Someone got there first',
  'blindtest.buzz.blocked.you_already_missed': 'You are out for this round',
  'blindtest.buzz.blocked.your_answer_is_pending': 'Say your answer out loud',
  'blindtest.buzz.ready': 'Hit it the moment you know',
  'blindtest.name': 'Blind test',
  'blindtest.tagline': 'Name the track before anyone else.',

  'connection.clock': '· clock ±{milliseconds} ms',
  'connection.closed': 'Reconnecting',
  'connection.connecting': 'Connecting',
  'connection.open': 'Live',

  'error.already_buzzed': 'Someone got there first.',
  'error.api.rejected': 'The server refused that.',
  'error.api.unexpected_response': 'The server answered something unexpected.',
  'error.api.unreachable': 'Could not reach the server. Try again in a moment.',
  'error.host_already_connected': 'Someone is already hosting this room.',
  'error.host_only_action': 'Only the host can do that.',
  'error.internal_error': 'Something broke on the server.',
  'error.invalid_message': 'The server did not understand that message.',
  'error.music_source_unavailable': 'The music service is not answering.',
  'error.nickname_taken': 'Someone already took that nickname.',
  'error.no_tracks_available': 'There are no tracks left to play.',
  'error.not_implemented': 'That part of the game is not built yet.',
  'error.player_locked_out': 'You are out for this round.',
  'error.protocol_version_mismatch': 'This page is out of date. Reload it.',
  'error.room_closed': 'The host closed the room.',
  'error.room_full': 'That room is full.',
  'error.room_not_found': 'That room does not exist.',
  'error.stale_round': 'That round is already over.',
  'error.wrong_phase': 'Too late, the game has moved on.',

  'host.invite.title': 'Scan to play',
  'host.players.empty': 'Nobody has joined yet. The QR code is waiting.',
  'host.players.title': 'Players',
  'host.roomCode': 'Room code',
  'host.startGame': 'Start the game',

  'join.divider': 'or',
  'join.host.action': 'Create a room',
  'join.host.description':
    'Opens the console with the QR code your friends scan.',
  'join.host.title': 'Run the game',
  'join.player.action': 'Join',
  'join.player.title': 'Join a game',
  'join.roomCode.description': 'Shown on the host screen.',
  'join.roomCode.invalid': 'A room code is {length} letters and digits.',
  'join.roomCode.label': 'Room code',
  'join.roomCode.unknown': 'No game is running under that code.',

  'notFound.back': 'Back to the start',
  'notFound.description': 'That game is over, or the code was mistyped.',
  'notFound.title': 'Nothing here',

  'player.nickname.action': 'Join the game',
  'player.nickname.label': 'Nickname',
  'player.nickname.title': 'What should we call you?',
  'player.points': 'points',
  'player.room': 'Room {code}',
  'player.roomSize': '{count} in the room',
  'player.seating': 'Taking your seat…',
  'player.you': 'You',

  'preferences.language': 'Language',
  'preferences.theme': 'Theme',
  'preferences.theme.dark': 'Dark',
  'preferences.theme.light': 'Light',
  'preferences.theme.system': 'System'
}
