
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import bodyParser from 'body-parser';
import * as store from './gameStore';
import * as core from 'quoridor-core';

const app = express();
// Simple CORS middleware for API endpoints (allows frontend dev server to call REST)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(bodyParser.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/games', (req, res) => {
  const players = req.body.players || 2;
  const { id, game } = store.createGame(players);
  res.json({ id, game });
});

app.get('/games/:id', (req, res) => {
  const game = store.getGame(req.params.id);
  if (!game) return res.status(404).json({ error: 'not found' });
  res.json({ id: req.params.id, game });
});

app.post('/games/:id/move', (req, res) => {
  const game = store.getGame(req.params.id);
  if (!game) return res.status(404).json({ error: 'not found' });
  const { playerId, to } = req.body;
  if (!playerId || typeof playerId !== 'string') return res.status(400).json({ error: 'missing playerId' });
  // enforce turn order
  if (game.players[game.turnIndex].id !== playerId) return res.status(400).json({ error: 'not your turn' });
  try {
    const next = core.applyMove(game, playerId, to);
    store.saveGame(req.params.id, next);
    const winner = core.checkWinner(next);
    io.emit('game_update', { id: req.params.id, game: next, winner });
    return res.json({ game: next });
  } catch (e: any) {
    return res.status(400).json({ error: e.message || 'illegal move' });
  }
});

app.post('/games/:id/place_wall', (req, res) => {
  const game = store.getGame(req.params.id);
  if (!game) return res.status(404).json({ error: 'not found' });
  const wall = req.body.wall;
  const playerId = req.body.playerId;
  if (!playerId || typeof playerId !== 'string') return res.status(400).json({ error: 'missing playerId' });
  // enforce turn order
  if (game.players[game.turnIndex].id !== playerId) return res.status(400).json({ error: 'not your turn' });
  try {
    const next = core.applyPlaceWall(game, wall);
    store.saveGame(req.params.id, next);
    const winner = core.checkWinner(next);
    io.emit('game_update', { id: req.params.id, game: next, winner });
    return res.json({ game: next });
  } catch (e: any) {
    return res.status(400).json({ error: e.message || 'illegal wall' });
  }
});

io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`socket disconnected: ${socket.id}`));
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
