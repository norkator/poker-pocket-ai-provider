import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import logger from './logger';
import {ChatMessageInterface, StatusUpdateInterface, TableInterface} from './interfaces';
import {fetchLLMChatCompletion, fetchLLMHoldemActionCompletion} from './llm';

dotenv.config();

const ws = new WebSocket(`${process.env.POKER_SERVER_API_ADDRESS}`);
let playerId: number = -1;
let authToken: string | null = null;
let playerName: string = '';
let selectedTable: TableInterface | null = null;
let playerCards: string[] = [];
let middleCards: string[] = [];

const username = process.env.PP_USERNAME;
const password = process.env.PP_PASSWORD;
const targetTableId: number = Number(process.env.TABLE_ID);
const targetTablePassword = process.env.TABLE_PASSWORD;

// Handle connection open
ws.on('open', () => {
  logger.info('Connected to the server');
});

// Handle incoming messages
ws.on('message', (data) => {
  const message: { key: string, data: any } = JSON.parse(data.toString());
  let success: boolean = false;
  switch (message.key) {
    case 'connected':
      playerId = Number(message.data.playerId);
      playerName = message.data.playerName;
      logger.info(`Got playerId ${playerId}`);
      ws.send(JSON.stringify({key: 'login', username: username, password: password}));
      break;
    case 'login':
      success = message.data.success;
      if (!success) {
        logger.fatal(`Failed to login with account ${username}`);
        process.exit(1);
      }
      authToken = message.data.token;
      logger.info(`Login success with account ${username}`);
      ws.send(JSON.stringify({key: 'userParams', token: authToken}));
      break;
    case 'userParams':
      success = message.data.success;
      playerName = message.data.username;
      if (!success) {
        logger.fatal(`Back end failed to set userParams for account ${username}`);
        process.exit(1)
      }
      logger.info(`Set of userParams success with account ${username}`);
      ws.send(JSON.stringify({key: 'getTables'}));
      break;
    case 'getTables':
      const table: TableInterface | null = findTargetTable(message.data.tables, targetTableId);
      if (table !== null) {
        logger.info(`Found target table ${table.tableName}`);
        selectedTable = table;
        ws.send(JSON.stringify({key: 'selectTable', tableId: table.tableId, password: targetTablePassword}));
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

function findTargetTable(tables: TableInterface[], targetTable: number): TableInterface | null {
  const filteredTables: TableInterface[] = tables
    .filter((t: TableInterface) => t.tableId === targetTable && t.game === 'HOLDEM' && t.playerCount < t.maxSeats);
  return filteredTables.length > 0 ? filteredTables[0] : null
}

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
