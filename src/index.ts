import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const ws = new WebSocket(`${process.env.POKER_SERVER_API_ADDRESS}`);
let playerId: number = -1;

// Handle connection open
ws.on('open', () => {
  logger.info('Connected to the server');
  ws.send(JSON.stringify({key: 'getTables'}));
});

// Handle incoming messages
ws.on('message', (data) => {
  const message: { key: string, data: any } = JSON.parse(data.toString());
  switch (message.key) {
    case 'connected':
      playerId = Number(message.data.playerId);
      logger.info(`Got playerId ${playerId}`);
      // ws.send(JSON.stringify({
      //   key: 'getTables',
      //   tableId: -1,
      // }));
      break;
    case 'getTables':
      const games = message.data.tables.filter((t: any) => t.game === 'HOLDEM');
      console.log(games);
      break;
    default:
      console.log(message);
      break;
  }
});

// Handle errors
ws.on('error', (error) => {
  logger.error(`WebSocket error: ${error.message}`);
});

// Handle connection close
ws.on('close', (code, reason) => {
  logger.info(`Connection closed: ${code} ${reason}`);
});
