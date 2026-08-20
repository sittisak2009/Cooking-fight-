const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let players = {};

io.on('connection', (socket) => {
    console.log('ผู้เล่นเชื่อมต่อแล้ว: ' + socket.id);

    // สร้างข้อมูลผู้เล่นเมื่อเข้าห้อง
    players[socket.id] = {
        id: socket.id,
        x: (Object.keys(players).length % 2 === 0) ? -1 : 1,
        z: 2,
        score: 0,
        holding: null
    };

    // ส่งข้อมูลผู้เล่นทั้งหมดกลับไป
    io.emit('currentPlayers', players);

    // รับตำแหน่งการเคลื่อนที่จากผู้เล่นแล้วกระจายให้คนอื่น
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].z = movementData.z;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // อัปเดตคะแนนเมื่อเสิร์ฟอาหารสำเร็จ
    socket.on('updateScore', (scoreData) => {
        if (players[socket.id]) {
            players[socket.id].score = scoreData.score;
            io.emit('scoreUpdated', { id: socket.id, score: scoreData.score });
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
      
