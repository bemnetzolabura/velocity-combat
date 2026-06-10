const TRACKS = {
  DESERT_CANYON: 'desert_canyon'
};

const GAME_STATES = {
  LOBBY: 'lobby',
  COUNTDOWN: 'countdown',
  RACING: 'racing',
  FINISHED: 'finished'
};

const PLAYER_STATES = {
  ALIVE: 'alive',
  DEAD: 'dead',
  SPECTATING: 'spectating',
  FINISHED: 'finished'
};

const SERVER_TICK_RATE = 20;
const CLIENT_TICK_RATE = 60;
const TICK_MS = 1000 / SERVER_TICK_RATE;
const MAX_PLAYERS = 8;
const LAP_COUNT = 3;
const RESPAWN_TIME = 3000;
const COUNTDOWN_SECONDS = 5;
const MAX_HEALTH = 100;
const NITRO_MAX = 100;

const ARENA = {
  width: 200,
  height: 60,
  depth: 200,
  trackWidth: 20,
  wallHeight: 3
};

module.exports = {
  TRACKS,
  GAME_STATES,
  PLAYER_STATES,
  SERVER_TICK_RATE,
  CLIENT_TICK_RATE,
  TICK_MS,
  MAX_PLAYERS,
  LAP_COUNT,
  RESPAWN_TIME,
  COUNTDOWN_SECONDS,
  MAX_HEALTH,
  NITRO_MAX,
  ARENA
};
