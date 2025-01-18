import WebSocket from 'ws';
import * as dotenv from 'dotenv';

dotenv.config();

const ws = new WebSocket(`wss://${process.env.POKER_SERVER_API_ADDRESS}`);

// Handle connection open
ws.on('open', () => {
  console.log('Connected to the server');
  ws.send('Hello Server!');
});

// Handle incoming messages
ws.on('message', (message: string) => {
  console.log(`Received: ${message}`);
});

// Handle errors
ws.on('error', (error) => {
  console.error(`WebSocket error: ${error.message}`);
});

// Handle connection close
ws.on('close', (code, reason) => {
  console.log(`Connection closed: ${code} ${reason}`);
});
