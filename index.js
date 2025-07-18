const express = require('express')
const cors = require('cors')

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = ['http://localhost:3000', 'https://messaging-app-henna-kappa.vercel.app/'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json());

const clients = new Map();

app.get('/stream/:conversationId', (req, res) => {
  const { conversationId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  if (!clients.has(conversationId)) clients.set(conversationId, []);
  clients.get(conversationId).push(send);

  req.on('close', () => {
    const arr = clients.get(conversationId) || [];
    clients.set(conversationId, arr.filter(s => s !== send));
  });
});

app.post('/send/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const data = req.body;

  const clientList = clients.get(conversationId) || [];
  for (const send of clientList) send(data);

  res.status(200).json({ delivered: clientList.length });
});

app.listen(PORT, () => {
  console.log(`SSE server running on port ${PORT}`);
});