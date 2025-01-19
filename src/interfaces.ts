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
