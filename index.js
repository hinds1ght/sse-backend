// sseServer.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const userConnections = new Map(); // userId -> Set of responses

// SSE subscription endpoint: user connects
app.get('/stream/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.sendStatus(400);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Add this res to the user's connection set
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  const connections = userConnections.get(userId);
  connections.add(res);

  console.log(`User ${userId} connected (${connections.size} connections)`);

  // Handle disconnection
  req.on('close', () => {
    connections.delete(res);
    if (connections.size === 0) {
      userConnections.delete(userId);
    }
    console.log(`User ${userId} disconnected (${connections.size} remaining)`);
  });
});

// Send message to a specific user (to all their tabs)
app.post('/send/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.sendStatus(400);

  const connections = userConnections.get(userId);
  if (!connections || connections.size === 0) {
    return res.status(404).json({ message: 'User not connected' });
  }

  const data = `data: ${JSON.stringify(req.body)}\n\n`;

  for (const conn of connections) {
    conn.write(data);
  }

  return res.sendStatus(200);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`SSE server running on port ${PORT}`);
});
