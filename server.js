const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>3D Cooking Battle - Online Matchmaking</title>
    <style>
        * { box-sizing: border-box; touch-action: none; margin: 0; padding: 0; }
        body { background: #0f0f1a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow: hidden; color: #fff; }
        
        /* หน้า Lobby / ค้นหาผู้เล่น */
        .overlay-screen {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 15, 26, 0.95); z-index: 100;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .card {
            background: #1e1e30; padding: 30px; border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; max-width: 350px; width: 90%;
            border: 1px solid #33334d;
        }
        h1 { color: #ffca28; margin-bottom: 20px; font-size: 24px; }
        input {
            width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px;
            border: 1px solid #444; background: #0f0f1a; color: #fff; text-align: center; font-size: 16px;
        }
        button {
            width: 100%; padding: 14px; border: none; border-radius: 8px;
            background: #ff9800; color: #fff; font-size: 18px; font-weight: bold; cursor: pointer;
            transition: 0.2s;
        }
        button:active { transform: scale(0.98); }
        .spinner {
            border: 4px solid rgba(255,255,255,0.1); width: 40px; height: 40px;
            border-radius: 50%; border-left-color: #ffca28; animation: spin 1s linear infinite; margin: 20px auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* UI ในเกม */
        #game-ui { display: none; position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 10; }
        .top-bar { position: absolute; top: 15px; left: 15px; right: 15px; display: flex; justify-content: space-between; }
        .player-card { background: rgba(0,0,0,0.75); padding: 10px 18px; border-radius: 8px; font-weight: bold; border-left: 4px solid #ff9800; }
        
        /* ปุ่มควบคุมมือถือ */
        .controls { position: absolute; bottom: 20px; left: 20px; display: grid; grid-template-columns: repeat(3, 50px); gap: 5px; pointer-events: auto; }
        .btn { width: 50px; height: 50px; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.5); border-radius: 10px; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; user-select: none; }
        #canvas-container { width: 100vw; height: 100vh; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>

<!-- หน้าเลือกชื่อ / เริ่มเกม -->
<div id="lobby-screen" class="overlay-screen">
    <div class="card">
        <h1>🍳 Cooking Battle 3D</h1>
        <input type="text" id="player-name" placeholder="ใส่ชื่อของคุณ" value="Player_${Math.floor(Math.random()*1000)}">
        <button onclick="startMatchmaking()">ค้นหาผู้เล่น</button>
    </div>
</div>

<!-- หน้าคอยจับคู่ -->
<div id="waiting-screen" class="overlay-screen" style="display: none;">
    <div class="card">
        <h2>กำลังค้นหาคู่แข่ง...</h2>
        <div class="spinner"></div>
        <p style="color: #aaa; font-size: 14px;">กรุณารอสักครู่ ระบบกำลังจับคู่คุณกับผู้เล่นออนไลน์คนอื่น</p>
    </div>
</div>

<!-- หน้าจอเกม 3D -->
<div id="game-ui">
    <div class="top-bar">
        <div class="player-card" style="border-color: #2196f3;" id="p1-info">คุณ (P1): 0</div>
        <div class="player-card" style="border-color: #f44336;" id="p2-info">คู่แข่ง (P2): 0</div>
    </div>
    <div class="controls">
        <div></div><div class="btn" id="btn-up">▲</div><div></div>
        <div class="btn" id="btn-left">◀</div><div class="btn" id="btn-down">▼</div><div class="btn" id="btn-right">▶</div>
    </div>
</div>

<div id="canvas-container"></div>

<script>
    const socket = io();
    let myRole = ''; // 'p1' หรือ 'p2'
    let roomId = '';
    let isGameStarted = false;

    // --- MATCHMAKING LOGIC ---
    function startMatchmaking() {
        const name = document.getElementById('player-name').value;
        document.getElementById('lobby-screen').style.display = 'none';
        document.getElementById('waiting-screen').style.display = 'flex';
        
        socket.emit('findMatch', { name: name });
    }

    socket.on('matchFound', (data) => {
        document.getElementById('waiting-screen').style.display = 'none';
        document.getElementById('game-ui').style.display = 'block';
        
        myRole = data.role;
        roomId = data.roomId;
        
        document.getElementById('p1-info').innerText = data.p1Name + " (P1)";
        document.getElementById('p2-info').innerText = data.p2Name + " (P2)";

        init3DGame();
    });

    // --- THREE.JS 3D ENGINE ---
    let scene, camera, renderer, p1Mesh, p2Mesh;
    const move = { up: false, down: false, left: false, right: false };

    function init3DGame() {
        if(isGameStarted) return;
        isGameStarted = true;

        const container = document.getElementById('canvas-container');
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 8, 7);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        // แสงสว่าง
        const light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(5, 10, 7);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        // พื้นสนาม
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.MeshStandardMaterial({ color: 0x2e2e48 }));
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // โต๊ะทำอาหารกลางสนาม
        const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1), new THREE.MeshStandardMaterial({ color: 0xff9800 }));
        table.position.set(0, 0.4, 0);
        scene.add(table);

        // ตัวละคร P1 (ฟ้า) และ P2 (แดง)
        p1Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.7), new THREE.MeshStandardMaterial({ color: 0x2196f3 }));
        p1Mesh.position.set(-2, 0.6, 2);
        scene.add(p1Mesh);

        p2Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.7), new THREE.MeshStandardMaterial({ color: 0xf44336 }));
        p2Mesh.position.set(2, 0.6, 2);
        scene.add(p2Mesh);

        setupControls();
        animate();
    }

    function setupControls() {
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

        const bindTouch = (id, dir) => {
            const el = document.getElementById(id);
            el.addEventListener('touchstart', (e) => { e.preventDefault(); move[dir] = true; });
            el.addEventListener('touchend', (e) => { e.preventDefault(); move[dir] = false; });
        };
        bindTouch('btn-up', 'up');
        bindTouch('btn-down', 'down');
        bindTouch('btn-left', 'left');
        bindTouch('btn-right', 'right');
    }

    socket.on('playerMoved', (data) => {
        if(data.role === 'p1') p1Mesh.position.set(data.x, 0.6, data.z);
        if(data.role === 'p2') p2Mesh.position.set(data.x, 0.6, data.z);
    });

    function animate() {
        requestAnimationFrame(animate);

        const myMesh = (myRole === 'p1') ? p1Mesh : p2Mesh;
        const speed = 0.07;
        let moved = false;

        if (move.up && myMesh.position.z > -3.5) { myMesh.position.z -= speed; moved = true; }
        if (move.down && myMesh.position.z < 3.5) { myMesh.position.z += speed; moved = true; }
        if (move.left && myMesh.position.x > -4.5) { myMesh.position.x -= speed; moved = true; }
        if (move.right && myMesh.position.x < 4.5) { myMesh.position.x += speed; moved = true; }

        if (moved) {
            socket.emit('playerMove', {
                roomId: roomId,
                role: myRole,
                x: myMesh.position.x,
                z: myMesh.position.z
            });
        }

        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        if(camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    });
<\/script>
</body>
</html>
    `);
});

// --- SERVER MATCHMAKING SYSTEM ---
let queue = [];

io.on('connection', (socket) => {
    socket.on('findMatch', (data) => {
        queue.push({ socketId: socket.id, name: data.name });

        if (queue.length >= 2) {
            const player1 = queue.shift();
            const player2 = queue.shift();
            const roomId = 'room_' + Date.now();

            io.to(player1.socketId).emit('matchFound', {
                roomId: roomId, role: 'p1', p1Name: player1.name, p2Name: player2.name
            });

            io.to(player2.socketId).emit('matchFound', {
                roomId: roomId, role: 'p2', p1Name: player1.name, p2Name: player2.name
            });
        }
    });

    socket.on('playerMove', (data) => {
        socket.broadcast.emit('playerMoved', data);
    });

    socket.on('disconnect', () => {
        queue = queue.filter(p => p.socketId !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Server running on port ' + PORT));
