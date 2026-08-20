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
    <title>3D Cooking Online 1v1</title>
    <style>
        * { box-sizing: border-box; touch-action: none; margin: 0; padding: 0; user-select: none; }
        body { background: #0e0e17; font-family: sans-serif; overflow: hidden; color: #fff; }
        
        .overlay-screen {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(14, 14, 23, 0.98); z-index: 100;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .start-btn {
            padding: 18px 45px; border: none; border-radius: 50px;
            background: linear-gradient(45deg, #ff9800, #ff5722); color: #fff;
            font-size: 22px; font-weight: bold; cursor: pointer;
            box-shadow: 0 6px 20px rgba(255,152,0,0.4);
        }
        
        .spinner {
            border: 4px solid rgba(255,255,255,0.1); width: 50px; height: 50px;
            border-radius: 50%; border-left-color: #ff9800; animation: spin 1s linear infinite; margin-bottom: 20px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        #game-ui { display: none; position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 10; }
        .top-bar { position: absolute; top: 15px; left: 15px; right: 15px; display: flex; justify-content: space-between; font-weight: bold; }
        .p-tag { background: rgba(0,0,0,0.7); padding: 8px 15px; border-radius: 8px; }
        
        /* ปุ่มควบคุมสำหรับมือถือ (Mobile Controls) */
        .controls { 
            position: absolute; bottom: 25px; left: 25px; 
            display: grid; grid-template-columns: repeat(3, 55px); gap: 8px; 
            pointer-events: auto; z-index: 20; 
        }
        .btn { 
            width: 55px; height: 55px; background: rgba(255,255,255,0.25); 
            border: 2px solid rgba(255,255,255,0.8); border-radius: 12px; 
            color: #fff; display: flex; align-items: center; justify-content: center; 
            font-size: 22px; font-weight: bold;
        }
        .btn:active { background: rgba(255,152,0,0.6); }

        #canvas-container { width: 100vw; height: 100vh; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>

<div id="start-screen" class="overlay-screen">
    <h1 style="color: #ffca28; margin-bottom: 30px; font-size: 28px;">🍳 Cooking Battle 3D</h1>
    <button class="start-btn" onclick="findOnlinePlayer()">เริ่มหาผู้เล่นออนไลน์</button>
</div>

<div id="searching-screen" class="overlay-screen" style="display: none;">
    <div class="spinner"></div>
    <h2 style="margin-bottom: 10px;">กำลังค้นหาผู้เล่นคนอื่น...</h2>
    <p style="color: #aaa; font-size: 14px;">เล่นได้ทั้ง PC (W A S D / ลูกศร) และ Mobile (กดปุ่มบนจอ)</p>
</div>

<div id="game-ui">
    <div class="top-bar">
        <div class="p-tag" style="border-left: 4px solid #2196f3;" id="p1-label">คุณ (P1)</div>
        <div class="p-tag" style="border-left: 4px solid #f44336;" id="p2-label">ผู้เล่นออนไลน์ (P2)</div>
    </div>
    
    <!-- ปุ่มกดบนหน้าจอมือถือ -->
    <div class="controls">
        <div></div><div class="btn" id="btn-up">▲</div><div></div>
        <div class="btn" id="btn-left">◀</div><div class="btn" id="btn-down">▼</div><div class="btn" id="btn-right">▶</div>
    </div>
</div>

<div id="canvas-container"></div>

<script>
    const socket = io();
    let myRole = '';
    let roomId = '';

    function findOnlinePlayer() {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('searching-screen').style.display = 'flex';
        socket.emit('joinMatchmaking');
    }

    socket.on('matchStart', (data) => {
        document.getElementById('searching-screen').style.display = 'none';
        document.getElementById('game-ui').style.display = 'block';
        
        myRole = data.role;
        roomId = data.roomId;
        
        init3DScene();
    });

    let scene, camera, renderer, p1Mesh, p2Mesh;
    const move = { up: false, down: false, left: false, right: false };

    function init3DScene() {
        const container = document.getElementById('canvas-container');
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        // ปรับระยะกล้องให้ถอยออกมาเห็นสนามกว้างขึ้นทั้งบน PC และ Mobile
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 11, 9);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        const light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(5, 12, 7);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), new THREE.MeshStandardMaterial({ color: 0x2e2e48 }));
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        const table = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0xff9800 }));
        table.position.set(0, 0.4, 0);
        scene.add(table);

        p1Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x2196f3 }));
        p1Mesh.position.set(-3, 0.6, 2);
        scene.add(p1Mesh);

        p2Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: 0xf44336 }));
        p2Mesh.position.set(3, 0.6, 2);
        scene.add(p2Mesh);

        setupControls();
        animate();
    }

    function setupControls() {
        // รองรับคีย์บอร์ด PC (W, A, S, D หรือ ลูกศร)
        window.addEventListener('keydown', e => {
            if(e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') move.up = true;
            if(e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') move.down = true;
            if(e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') move.left = true;
            if(e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') move.right = true;
        });

        window.addEventListener('keyup', e => {
            if(e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') move.up = false;
            if(e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') move.down = false;
            if(e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') move.left = false;
            if(e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') move.right = false;
        });

        // รองรับระบบ Touch บนมือถือ
        const bindTouch = (id, dir) => {
            const el = document.getElementById(id);
            if(!el) return;
            
            const startHandler = (e) => { e.preventDefault(); move[dir] = true; };
            const endHandler = (e) => { e.preventDefault(); move[dir] = false; };

            el.addEventListener('touchstart', startHandler, { passive: false });
            el.addEventListener('touchend', endHandler, { passive: false });
            el.addEventListener('mousedown', startHandler);
            el.addEventListener('mouseup', endHandler);
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
        const speed = 0.08;
        let moved = false;

        if (move.up && myMesh.position.z > -4) { myMesh.position.z -= speed; moved = true; }
        if (move.down && myMesh.position.z < 4) { myMesh.position.z += speed; moved = true; }
        if (move.left && myMesh.position.x > -5) { myMesh.position.x -= speed; moved = true; }
        if (move.right && myMesh.position.x < 5) { myMesh.position.x += speed; moved = true; }

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

let waitingQueue = [];

io.on('connection', (socket) => {
    socket.on('joinMatchmaking', () => {
        if (!waitingQueue.includes(socket.id)) {
            waitingQueue.push(socket.id);
        }

        if (waitingQueue.length >= 2) {
            const p1Socket = waitingQueue.shift();
            const p2Socket = waitingQueue.shift();
            const roomId = 'room_' + Date.now();

            io.to(p1Socket).emit('matchStart', { roomId: roomId, role: 'p1' });
            io.to(p2Socket).emit('matchStart', { roomId: roomId, role: 'p2' });
        }
    });

    socket.on('playerMove', (data) => {
        socket.broadcast.emit('playerMoved', data);
    });

    socket.on('disconnect', () => {
        waitingQueue = waitingQueue.filter(id => id !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Server running on port ' + PORT));
