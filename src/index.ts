import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import logger from './logger';
import {ChatMessageInterface, StatusUpdateInterface, TableInterface} from './interfaces';
import {fetchLLMChatCompletion, fetchLLMHoldemActionCompletion} from './llm';

dotenv.config();

const ws = new WebSocket(`${process.env.POKER_SERVER_API_ADDRESS}`);
let playerId: number = -1;
let playerName: string = '';
let selectedTable: TableInterface | null = null;
let playerCards: string[] = [];
let middleCards: string[] = [];

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
    case 'holeCards':
      const holeCards: string[] = message.data.players
        .find((player: any) => player.playerId === playerId)?.cards ?? [];
      logger.info(`My hole cards ${holeCards}`);
      playerCards = holeCards;
      break;
    case 'statusUpdate':
      const statusUpdate = message.data as StatusUpdateInterface;
      const isPlayerTurn = statusUpdate.playersData
        .find(player => Number(player.playerId) === Number(playerId))?.isPlayerTurn ?? false;
      middleCards = statusUpdate.middleCards ?? [];
      const highestTotalBet: number = statusUpdate.playersData
        .reduce((max, player) => Math.max(max, Number(player.totalBet)), 0);
      if (isPlayerTurn && selectedTable !== null) {
        logger.info(`It's now our turn`);
        const table = selectedTable; // Capture the value
        fetchLLMHoldemActionCompletion(
          playerCards, middleCards, statusUpdate.currentStatus, highestTotalBet
        ).then((action: { action: string; amount?: number; reason: string } | null) => {
          if (action !== null) {
            logger.info(`Action ${action.action} for table ${table.tableId}. Reason ${action.reason}`);
            if (action.action.includes('CHECK')) {
              setCheck(table.tableId);
            } else if (action.action.includes('CALL')) {
              setCheck(table.tableId);
            } else if (action.action.includes('FOLD')) {
              setFold(table.tableId);
            } else if (action.action.includes('RAISE') && action.amount) {
              const amount: number = Number(action.amount);
              setRaise(table.tableId, amount);
            } else {
              setFold(table.tableId);
            }
          } else {
            logger.warn('LLM null action, will fold');
            setFold(table.tableId);
          }
        });
      }
      break;
    case 'chatMessage':
      const chatMessage: ChatMessageInterface = message.data.chatMessage;
      if (selectedTable !== null && chatMessage.playerName !== playerName) {
        fetchLLMChatCompletion(
          selectedTable.game, playerName, playerCards, middleCards, chatMessage.playerName, chatMessage.message
        ).then((msg: string | null) => {
          if (msg !== null) {
            ws.send(JSON.stringify({key: 'chatMessage', message: msg}));
          }
        });
      }
      break;
    default:
      // console.log(message);
      break;
  }
});

ws.on('ping', () => {
  // logger.debug('Ping received from server. Answering with pong.');
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

function setFold(tableId: number) {
  ws.send(JSON.stringify({
    key: 'setFold',
    tableId: tableId,
  }));
}

function setCheck(tableId: number) {
  ws.send(JSON.stringify({
    key: 'setCheck',
    tableId: tableId,
  }));
}

function setRaise(tableId: number, amount: number) {
  ws.send(JSON.stringify({
    key: 'setRaise',
    tableId: tableId,
    amount
  }));
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
