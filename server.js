// File: server.js
// A simple WebRTC signaling server.

const { WebSocketServer } = require('ws');
const http = require('http');

// A map to store rooms and the clients within them.
// Key: room name (e.g., 'GAME-12345'), Value: Set of WebSocket clients
const rooms = new Map();

// 1. Create a simple HTTP server.
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Signaling server is active.');
});

// 2. Attach the WebSocket server to the HTTP server.
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // The room name is determined by the URL path.
  const roomName = req.url.slice(1); // remove leading '/'
  if (!roomName) {
    ws.close(1008, 'Room name is required.');
    return;
  }

  // Get or create the room.
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }
  const room = rooms.get(roomName);

  // Add the new client to the room.
  room.add(ws);
  console.log(`Client connected to room: ${roomName}. Total clients in room: ${room.size}`);

  // When a message is received, broadcast it to all other clients in the same room.
  ws.on('message', (message) => {
    room.forEach(client => {
      // Don't send the message back to the sender.
      if (client !== ws && client.readyState === client.OPEN) {
        // We need to convert the buffer to a string for logging, but send the original buffer.
        // console.log(`Broadcasting message in room ${roomName}: ${message.toString()}`);
        client.send(message);
      }
    });
  });

  // When a client disconnects, remove them from the room.
  ws.on('close', () => {
    room.delete(ws);
    console.log(`Client disconnected from room: ${roomName}. Total clients in room: ${room.size}`);
    // If the room is empty, remove it to clean up memory.
    if (room.size === 0) {
      rooms.delete(roomName);
      console.log(`Room ${roomName} is now empty and has been closed.`);
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for client in room ${roomName}:`, error);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`✅ Signaling server is running on http://localhost:${PORT}`);
});