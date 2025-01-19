import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import logger from './logger';
import {ChatMessageInterface, TableInterface} from './interfaces';
import {fetchLLMChatCompletion} from './llm';

dotenv.config();

const ws = new WebSocket(`${process.env.POKER_SERVER_API_ADDRESS}`);
let playerId: number = -1;
let playerName: string = '';
let selectedTable: TableInterface | null = null;
let playerCards: string[] = [];
let middleCardsStr: string[] = [];

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
      playerName = message.data.playerName;
      logger.info(`Got playerId ${playerId}`);
      break;
    case 'getTables':
      const table = findSuitableTable(message.data.tables);
      if (table !== null) {
        logger.info(`Found suitable table ${table.tableName}`);
        selectedTable = table;
        ws.send(JSON.stringify({key: 'selectTable', tableId: table.tableId}));
      }
      break;
    case 'statusUpdate':
      /* */
      break;
    case 'chatMessage':
      const chatMessage: ChatMessageInterface = message.data.chatMessage;
      if (selectedTable !== null && chatMessage.playerName !== playerName) {
        fetchLLMChatCompletion(
          selectedTable.game, playerName, playerCards, middleCardsStr, chatMessage.playerName, chatMessage.message
        ).then((msg: string | null) => {
          if (msg !== null) {
            ws.send(JSON.stringify({key: 'chatMessage', message: msg}));
          }
        });
      }
      break;
    default:
      console.log(message);
      break;
  }
});

ws.on('ping', () => {
  logger.debug('Ping received from server. Answering with pong.');
  ws.pong(); // Send a pong response
});

// Handle errors
ws.on('error', (error) => {
  logger.error(`WebSocket error: ${error.message}`);
});

// Handle connection close
ws.on('close', (code, reason) => {
  logger.info(`Connection closed: ${code} ${reason}`);
});

function findSuitableTable(tables: TableInterface[]): TableInterface | null {
  const filteredTables: TableInterface[] = tables
    .filter((t: TableInterface) => t.game === 'HOLDEM' && !t.passwordProtected && t.playerCount < t.maxSeats);
  return filteredTables.length > 0 ? filteredTables[0] : null
}
