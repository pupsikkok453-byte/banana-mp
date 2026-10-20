const http = require('http');
const path = require('path');
const express = require('express');
const colyseus = require('colyseus');
const { GameRoom } = require('./rooms/GameRoom');

const port = process.env.PORT || 2567;
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.send('OK'));

const server = http.createServer(app);
const gameServer = new colyseus.Server({ server });
gameServer.define('game_room', GameRoom).filterBy(['code']);

gameServer.listen(port).then(() => {
  console.log('🌐 Сервер: http://localhost:' + port);
});