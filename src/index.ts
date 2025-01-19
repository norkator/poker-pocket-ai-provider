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
      if (isPlayerTurn && selectedTable !== null) {
        logger.info(`It's now our turn`);
        fetchLLMHoldemActionCompletion(playerCards, middleCards).then((action: string | null) => {
          if (action !== null) {
            switch (action) {
              case 'CALL':
              case 'CHECK':
                setCheck(selectedTable?.tableId || -1);
                break;
              // case 'RAISE':
              //   const amount = ...
              //   setRaise(table.tableId, amount);
              default:
                setFold(selectedTable?.tableId || -1);
                break;
            }
          } else {
            console.log('null action');
            setFold(selectedTable?.tableId || -1)
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

function setFold(tableId: number) {
  const data = JSON.stringify({
    key: 'setFold',
    tableId: tableId,
  });
  ws.send(data);
}

function setCheck(tableId: number) {
  const data = JSON.stringify({
    key: 'setCheck',
    tableId: tableId,
  });
  ws.send(data);
}
