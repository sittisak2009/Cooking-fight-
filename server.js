const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let waitingQueue = [];
let roomData = {};
const possibleOrders = ['Chopped', 'Boiled', 'Fried'];

function getRandomOrder() {
    return possibleOrders[Math.floor(Math.random() * possibleOrders.length)];
}

io.on('connection', (socket) => {

    socket.on('findMatch', (data) => {
        socket.playerName = data.name || 'Player';

        // ป้องกัน Socket ซ้ำในคิว
        waitingQueue = waitingQueue.filter(s => s.id !== socket.id);
        waitingQueue.push(socket);

        // เมื่อครบ 2 คน เริ่มจับคู่ทันที
        if (waitingQueue.length >= 2) {
            const p1 = waitingQueue.shift();
            const p2 = waitingQueue.shift();

            if (!p1.connected || !p2.connected) {
                if (p1.connected) waitingQueue.unshift(p1);
                if (p2.connected) waitingQueue.unshift(p2);
                return;
            }

            const roomId = 'ROOM_' + Math.floor(1000 + Math.random() * 9000);

            roomData[roomId] = {
                p1: { id: p1.id, name: p1.playerName, score: 0 },
                p2: { id: p2.id, name: p2.playerName, score: 0 },
                timeLeft: 180,
                currentOrder: getRandomOrder(),
                gameInterval: null
            };

            p1.join(roomId);
            p2.join(roomId);
            p1.roomId = roomId;
            p2.roomId = roomId;

            // แจ้งเตือนฝั่ง Client และสั่งเริ่มเกมทันที
            p1.emit('joinedRoom', { roomId: roomId, role: 'p1' });
            p2.emit('joinedRoom', { roomId: roomId, role: 'p2' });

            io.to(roomId).emit('gameStart');
            io.to(roomId).emit('newOrder', roomData[roomId].currentOrder);

            // เริ่มนับเวลาถอยหลังทันที
            roomData[roomId].gameInterval = setInterval(() => {
                if (roomData[roomId]) {
                    roomData[roomId].timeLeft--;
                    io.to(roomId).emit('timerUpdate', roomData[roomId].timeLeft);

                    if (roomData[roomId].timeLeft <= 0) {
                        clearInterval(roomData[roomId].gameInterval);
                        io.to(roomId).emit('gameOver', {
                            p1: roomData[roomId].p1.score,
                            p2: roomData[roomId].p2.score
                        });
                        delete roomData[roomId];
                    }
                } else {
                    clearInterval(roomData[roomId].gameInterval);
                }
            }, 1000);
        }
    });

    socket.on('playerMove', (data) => socket.to(data.roomId).emit('playerMoved', data));
    socket.on('updateHolding', (data) => socket.to(data.roomId).emit('holdingUpdated', data));

    socket.on('updateScore', (data) => {
        if (roomData[data.roomId]) {
            if (data.role === 'p1') roomData[data.roomId].p1.score = data.score;
            if (data.role === 'p2') roomData[data.roomId].p2.score = data.score;
            io.to(data.roomId).emit('scoreUpdated', data);
        }
    });

    socket.on('completeOrder', (data) => {
        if (roomData[data.roomId]) {
            const nextOrder = getRandomOrder();
            roomData[data.roomId].currentOrder = nextOrder;
            io.to(data.roomId).emit('newOrder', nextOrder);
        }
    });

    socket.on('disconnect', () => {
        waitingQueue = waitingQueue.filter(s => s.id !== socket.id);

        if (socket.roomId && roomData[socket.roomId]) {
            const roomId = socket.roomId;
            if (roomData[roomId].gameInterval) {
                clearInterval(roomData[roomId].gameInterval);
            }
            io.to(roomId).emit('playerLeft');
            delete roomData[roomId];
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Cooking Battle Server online on port ' + PORT));
                    
