import axios from 'axios';
import * as dotenv from 'dotenv';
import {Game} from './types';
import {
  ChatCompletionResponse,
  CurrentTableInfoInterface
} from './interfaces';

dotenv.config();

const model = process.env.LLM_MODEL;

function getGameName(game: Game): string {
  switch (game) {
    case "HOLDEM":
      return "Texas hold 'em";
    case "FIVE_CARD_DRAW":
      return "Five-card draw";
    default:
      return "";
  }
}

export async function fetchLLMChatCompletion(
  game: Game,
  playerName: string,
  playerCards: string[],
  middleCards: string[],
  msgPlayerName: string,
  userMsg: string,
  currentTableInfo: CurrentTableInfoInterface
): Promise<string | null> {

  const gameInstruction = `You are a rude but humorous bot in a ${getGameName(game)} table and your name is ${playerName}`;
  const chatInstructions = `You are part of public chat where user called ${msgPlayerName} sent a message.`;
  const cardsInstructions = `You have ${playerCards.join(', ')} cards and middle cards ${middleCards.join(', ')} and you use this information for bluffing reasons.`;
  const limitations = `Keep answer under 40 characters.`

  const url = `${process.env.JAN_AI_SERVER_ADDRESS}/v1/chat/completions`;
  const data = {
    messages: [
      {role: 'system', content: `${gameInstruction} ${chatInstructions} ${cardsInstructions} ${limitations}`},
      {role: 'user', content: userMsg},
    ],
    model: model,
    stream: false,
    max_tokens: 2048,
    stop: null,
    frequency_penalty: 0,
    presence_penalty: 0,
    temperature: 0.7,
    top_p: 0.95,
  };

  try {
    const response = await axios.post<ChatCompletionResponse>(url, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const {choices, usage} = response.data;
    return choices.length > 0 ? choices[0].message.content : null;
  } catch (error) {
    return null;
  }
}


export async function fetchLLMHoldemActionCompletion(
  playerCards: string[],
  middleCards: string[],
  currentStatus: string,
  highestTotalBet: number
): Promise<{ action: string; amount?: number; reason: string } | null> {
  const gameInstruction = `You are playing at a Texas hold 'em table. Your task is to determine the next action to proceed. Your response should be a JSON object in the following format:
{
  "action": "RAISE" | "CALL" | "CHECK" | "FOLD",
  "amount": <number>, // Only for RAISE, otherwise null or omitted
  "reason": <string> // Small explanation of why this action was chosen
}`;
  const cardsInstructions = `You have ${playerCards.join(', ')} as hole cards, and the current middle cards are ${middleCards.join(', ')}.`;
  const currentStatusInstruction = `The game's current status is ${currentStatus}. The highest total bet so far is ${highestTotalBet}.`;
  const limitations = `You can only choose from these actions: RAISE, CALL, CHECK, or FOLD. Use FOLD only in rare cases.`;

  const url = `${process.env.JAN_AI_SERVER_ADDRESS}/v1/chat/completions`;
  const data = {
    messages: [
      {
        role: 'system',
        content: `${gameInstruction} ${cardsInstructions} ${currentStatusInstruction} ${limitations}`
      },
      {role: 'user', content: 'What is your action?'},
    ],
    model: model,
    stream: false,
    max_tokens: 2048,
    stop: null,
    frequency_penalty: 0,
    presence_penalty: 0,
    temperature: 0.7,
    top_p: 0.95,
  };

  try {
    const response = await axios.post<ChatCompletionResponse>(url, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const {choices} = response.data;
    if (choices.length > 0) {
      const content = choices[0].message.content;
      try {
        const actionResponse = JSON.parse(content);
        if (actionResponse && actionResponse.action && actionResponse.reason) {
          return actionResponse;
        }
      } catch (e) {
        console.error('Error parsing AI response:', e);
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching AI action:', error);
    return null;
  }
}

