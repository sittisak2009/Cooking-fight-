const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// ส่งหน้าเว็บ HTML ตรงๆ โดยไม่ต้องสร้างโฟลเดอร์ public
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>3D Cooking Battle - Online</title>
    <style>
        * { box-sizing: border-box; touch-action: none; }
        body { margin: 0; overflow: hidden; background: #000; font-family: sans-serif; }
        #ui-layer {
            position: absolute; top: 10px; left: 10px; right: 10px;
            display: flex; justify-content: space-between; color: #fff;
            font-weight: bold; z-index: 10; pointer-events: none;
        }
        .score-card { background: rgba(0,0,0,0.7); padding: 10px 15px; border-radius: 8px; }
        .controls {
            position: absolute; bottom: 20px; left: 20px;
            display: grid; grid-template-columns: repeat(3, 50px); gap: 5px; z-index: 10;
        }
        .btn {
            width: 50px; height: 50px; background: rgba(255,255,255,0.3);
            border: 2px solid #fff; border-radius: 10px; color: #fff;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; font-weight: bold; user-select: none;
        }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
</head>
<body>

<div id="ui-layer">
    <div class="score-card" style="border-left: 4px solid #2196f3;">คุณ (P1): <span id="my-score">0</span></div>
    <div class="score-card" style="border-left: 4px solid #f44336;">คู่แข่ง (P2): <span id="enemy-score">0</span></div>
</div>

<div class="controls">
    <div></div><div class="btn" id="btn-up">▲</div><div></div>
    <div class="btn" id="btn-left">◀</div><div class="btn" id="btn-down">▼</div><div class="btn" id="btn-right">▶</div>
</div>

<script>
    const socket = io();
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x11111d);
    
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(5, 10, 7);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // พื้นสนาม 3D
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), new THREE.MeshStandardMaterial({ color: 0x222233 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // โต๊ะทำอาหาร
    const table = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff9800 }));
    table.position.set(0, 0.5, -2);
    scene.add(table);

    function createPlayerMesh(color) {
        return new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: color }));
    }

    let myMesh = createPlayerMesh(0x2196f3);
    myMesh.position.set(-1, 0.6, 2);
    scene.add(myMesh);

    let otherPlayers = {};

    socket.on('currentPlayers', (players) => {
        Object.keys(players).forEach((id) => {
            if (id !== socket.id && !otherPlayers[id]) {
                otherPlayers[id] = createPlayerMesh(0xf44336);
                scene.add(otherPlayers[id]);
            }
        });
    });

    socket.on('playerMoved', (playerData) => {
        if (otherPlayers[playerData.id]) {
            otherPlayers[playerData.id].position.set(playerData.x, 0.6, playerData.z);
        }
    });

    socket.on('playerDisconnected', (id) => {
        if (otherPlayers[id]) {
            scene.remove(otherPlayers[id]);
            delete otherPlayers[id];
        }
    });

    const move = { up: false, down: false, left: false, right: false };
    const speed = 0.08;

    window.addEventListener('keydown', e => {
        if(e.key === 'w' || e.key === 'ArrowUp') move.up = true;
        if(e.key === 's' || e.key === 'ArrowDown') move.down = true;
        if(e.key === 'a' || e.key === 'ArrowLeft') move.left = true;
        if(e.key === 'd' || e.key === 'ArrowRight') move.right = true;
    });

    window.addEventListener('keyup', e => {
        if(e.key === 'w' || e.key === 'ArrowUp') move.up = false;
        if(e.key === 's' || e.key === 'ArrowDown') move.down = false;
        if(e.key === 'a' || e.key === 'ArrowLeft') move.left = false;
        if(e.key === 'd' || e.key === 'ArrowRight') move.right = false;
    });

    const setupTouch = (id, key) => {
        const el = document.getElementById(id);
        el.addEventListener('touchstart', (e) => { e.preventDefault(); move[key] = true; });
        el.addEventListener('touchend', (e) => { e.preventDefault(); move[key] = false; });
    };
    setupTouch('btn-up', 'up');
    setupTouch('btn-down', 'down');
    setupTouch('btn-left', 'left');
    setupTouch('btn-right', 'right');

    function animate() {
        requestAnimationFrame(animate);

        let moved = false;
        if (move.up && myMesh.position.z > -4) { myMesh.position.z -= speed; moved = true; }
        if (move.down && myMesh.position.z < 4) { myMesh.position.z += speed; moved = true; }
        if (move.left && myMesh.position.x > -5) { myMesh.position.x -= speed; moved = true; }
        if (move.right && myMesh.position.x < 5) { myMesh.position.x += speed; moved = true; }

        if (moved) {
            socket.emit('playerMovement', { x: myMesh.position.x, z: myMesh.position.z });
        }

        renderer.render(scene, camera);
    }

    animate();
<\/script>
</body>
</html>
    `);
});

let players = {};

io.on('connection', (socket) => {
    players[socket.id] = { id: socket.id, x: 0, z: 2 };
    io.emit('currentPlayers', players);

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].z = movementData.z;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Server running on port ' + PORT));
