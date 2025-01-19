import WebSocket from 'ws';
import {Game} from './types';

export interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

export interface ChatCompletionResponse {
  choices: {
    finish_reason: string;
    index: number;
    message: {
      content: string;
      role: string;
    };
  }[];
  created: number;
  id: string;
  model: string;
  object: string;
  system_fingerprint: string;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface TableInterface {
  game: Game;
  tableId: number;
  tableName: string;
  tableMinBet: number;
  playerCount: number;
  maxSeats: number;
  passwordProtected: boolean;
}

export interface ChatMessageInterface {
  playerName: string;
  message: string;
}

export interface PlayersDataInterface {
  playerId: number;
  playerName: string;
  playerMoney: number;
  totalBet: number;
  isPlayerTurn: boolean;
  isFold: boolean;
  timeLeft: number;
  timeBar: number;
}

export interface StatusUpdateInterface {
  totalPot: number;
  tableMinBet: number;
  currentStatus: string;
  currentTurnText: string;
  middleCards: string[];
  playersData: PlayersDataInterface[];
  isCallSituation: boolean;
  isResultsCall: boolean;
  roundWinnerPlayerIds: number[];
  roundWinnerPlayerCards: string[];
  tableName: string;
  playingPlayersCount: number;
  appendPlayersCount: number;
  spectatorsCount: number;
  deckStatus: string;
  deckCardsBurned: number;
  collectingPot: boolean;
}
