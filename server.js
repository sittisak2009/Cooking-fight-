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
    <title>3D Cooking Online 1v1 - Complete</title>
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
        .p-tag { background: rgba(0,0,0,0.75); padding: 8px 15px; border-radius: 8px; font-size: 14px; }
        
        #timer-box {
            position: absolute; top: 15px; left: 50%; transform: translateX(-50%);
            background: #ff5722; padding: 8px 20px; border-radius: 20px;
            font-size: 20px; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }

        #item-status {
            position: absolute; top: 65px; left: 15px; background: rgba(0,0,0,0.8);
            padding: 8px 12px; border-radius: 8px; font-size: 13px; color: #ffca28;
        }

        /* 3D UI Overlay (เขียง/เตา) */
        .progress-container {
            position: absolute; width: 80px; height: 12px; background: rgba(0,0,0,0.6);
            border: 2px solid #fff; border-radius: 6px; overflow: hidden; display: none;
            transform: translate(-50%, -50%); pointer-events: none; z-index: 15;
        }
        .progress-bar { width: 0%; height: 100%; background: #2196f3; transition: width 0.1s linear; }
        
        .status-badge {
            position: absolute; padding: 3px 8px; background: rgba(0,0,0,0.8);
            border-radius: 10px; font-size: 11px; font-weight: bold; color: #fff;
            transform: translate(-50%, -50%); display: none; pointer-events: none; z-index: 15;
            white-space: nowrap;
        }

        /* ปุ่มเดินและปุ่มทำอาหาร */
        .controls { 
            position: absolute; bottom: 20px; left: 20px; 
            display: grid; grid-template-columns: repeat(3, 50px); gap: 6px; 
            pointer-events: auto; z-index: 20; 
        }
        .btn { 
            width: 50px; height: 50px; background: rgba(255,255,255,0.25); 
            border: 2px solid rgba(255,255,255,0.8); border-radius: 10px; 
            color: #fff; display: flex; align-items: center; justify-content: center; 
            font-size: 20px; font-weight: bold;
        }
        
        #action-btn {
            position: absolute; bottom: 25px; right: 25px;
            width: 70px; height: 70px; background: #ff9800; border: 3px solid #fff;
            border-radius: 50%; color: #fff; font-size: 24px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto; z-index: 20; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
        #action-btn:active { transform: scale(0.9); }

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
    <h2 style="margin-bottom: 10px;">กำลังค้นหาคู่แข่ง...</h2>
    <p style="color: #aaa; font-size: 14px;">PC: เดิน W A S D / กด E ทำอาหาร | Mobile: ใช้ปุ่มบนจอ</p>
</div>

<div id="gameover-screen" class="overlay-screen" style="display: none;">
    <h1 id="winner-title" style="color: #ffca28; margin-bottom: 15px; font-size: 32px;">จบการแข่งขัน!</h1>
    <h2 id="winner-desc" style="margin-bottom: 30px; color: #fff;"></h2>
    <button class="start-btn" onclick="location.reload()">เล่นใหม่อีกครั้ง</button>
</div>

<!-- UI หลอดเวลาลอยบน 3D (Stove & Chopper) -->
<div id="stove-ui" class="progress-container"><div id="stove-bar" class="progress-bar"></div></div>
<div id="stove-badge" class="status-badge">กำลังต้ม...</div>

<div id="chop-ui" class="progress-container"><div id="chop-bar" class="progress-bar"></div></div>
<div id="chop-badge" class="status-badge" style="background: #ff9800;">กำลังหั่น...</div>

<div id="game-ui">
    <div class="top-bar">
        <div class="p-tag" style="border-left: 4px solid #2196f3;" id="p1-label">คุณ (P1): <span id="p1-score">0</span></div>
        <div class="p-tag" style="border-left: 4px solid #f44336;" id="p2-label">คู่แข่ง (P2): <span id="p2-score">0</span></div>
    </div>

    <div id="timer-box">90</div>
    <div id="item-status">ในมือ: <span id="holding-text" style="color:#fff;">ไม่มี</span></div>
    
    <div class="controls">
        <div></div><div class="btn" id="btn-up">▲</div><div></div>
        <div class="btn" id="btn-left">◀</div><div class="btn" id="btn-down">▼</div><div class="btn" id="btn-right">▶</div>
    </div>

    <div id="action-btn">E</div>
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
    let crateStation, chopStation, stoveStation, serveStation;
    let myHolding = null;
    let myScore = 0;
    let isGameOver = false;

    let stoveState = "ว่าง";
    let stoveTimer = 0;
    const STOVE_TIME = 4.0;

    let isChopping = false;
    let chopTimer = 0;
    const CHOP_TIME = 2.0;

    let p1ItemMesh, p2ItemMesh;
    const move = { up: false, down: false, left: false, right: false };

    function createFoodMesh(type) {
        let geo, mat;
        if(type === "Raw") {
            geo = new THREE.DodecahedronGeometry(0.25);
            mat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
        } else if(type === "Chopped") {
            geo = new THREE.BoxGeometry(0.3, 0.1, 0.3);
            mat = new THREE.MeshStandardMaterial({ color: 0x8bc34a });
        } else if(type === "Cooked") {
            geo = new THREE.SphereGeometry(0.25);
            mat = new THREE.MeshStandardMaterial({ color: 0xff9800 });
        } else {
            return null;
        }
        const m = new THREE.Mesh(geo, mat);
        m.position.y = 1.0;
        return m;
    }

    function updateHoldingVisual(role, itemType) {
        const targetMesh = (role === 'p1') ? p1Mesh : p2Mesh;
        if(role === 'p1' && p1ItemMesh) { p1Mesh.remove(p1ItemMesh); p1ItemMesh = null; }
        if(role === 'p2' && p2ItemMesh) { p2Mesh.remove(p2ItemMesh); p2ItemMesh = null; }

        if(itemType) {
            const newItem = createFoodMesh(itemType);
            if(newItem) {
                targetMesh.add(newItem);
                if(role === 'p1') p1ItemMesh = newItem;
                if(role === 'p2') p2ItemMesh = newItem;
            }
        }
    }

    function init3DScene() {
        const container = document.getElementById('canvas-container');
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

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

        function createStation(x, z, color) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: color }));
            m.position.set(x, 0.4, z);
            scene.add(m);
            return m;
        }

        crateStation = createStation(-4, -2, 0x4caf50);  
        chopStation  = createStation(-1.3, -2, 0xff9800); 
        stoveStation = createStation(1.3, -2, 0xf44336);   
        serveStation = createStation(4, -2, 0xffeb3b);   

        p1Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x2196f3 }));
        p1Mesh.position.set(-3, 0.6, 2);
        scene.add(p1Mesh);

        p2Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: 0xf44336 }));
        p2Mesh.position.set(3, 0.6, 2);
        scene.add(p2Mesh);

        setupControls();
        animate();
    }

    function interact() {
        if(isGameOver || isChopping) return;
        const myMesh = (myRole === 'p1') ? p1Mesh : p2Mesh;

        if(myMesh.position.distanceTo(crateStation.position) < 1.8 && !myHolding) {
            myHolding = "Raw";
        }
        else if(myMesh.position.distanceTo(chopStation.position) < 1.8 && myHolding === "Raw") {
            isChopping = true;
            chopTimer = 0;
        }
        else if(myMesh.position.distanceTo(stoveStation.position) < 1.8) {
            if(myHolding === "Chopped" && stoveState === "ว่าง") {
                myHolding = null;
                stoveState = "กำลังต้ม";
                stoveTimer = 0;
            } else if(!myHolding && stoveState === "สุกแล้ว") {
                myHolding = "Cooked";
                stoveState = "ว่าง";
            }
        }
        else if(myMesh.position.distanceTo(serveStation.position) < 1.8 && myHolding === "Cooked") {
            myHolding = null;
            myScore += 100;
            socket.emit('updateScore', { roomId: roomId, role: myRole, score: myScore });
        }

        const textMap = { 'Raw': 'ผักดิบ', 'Chopped': 'ผักหั่นแล้ว', 'Cooked': 'ต้มผักสุก' };
        document.getElementById('holding-text').innerText = textMap[myHolding] || 'ไม่มี';

        updateHoldingVisual(myRole, myHolding);
        socket.emit('updateHolding', { roomId: roomId, role: myRole, item: myHolding });
    }

    function toScreenPosition(obj, camera) {
        var vector = new THREE.Vector3();
        obj.updateMatrixWorld();
        vector.setFromMatrixPosition(obj.matrixWorld);
        vector.y += 1.2;
        vector.project(camera);

        var widthHalf = window.innerWidth / 2;
        var heightHalf = window.innerHeight / 2;

        return {
            x: (vector.x * widthHalf) + widthHalf,
            y: -(vector.y * heightHalf) + heightHalf
        };
    }

    function setupControls() {
        window.addEventListener('keydown', e => {
            if(e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') move.up = true;
            if(e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') move.down = true;
            if(e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') move.left = true;
            if(e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') move.right = true;
            if(e.key === 'e' || e.key === 'E') interact();
        });

        window.addEventListener('keyup', e => {
            if(e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') move.up = false;
            if(e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') move.down = false;
            if(e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') move.left = false;
            if(e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') move.right = false;
        });

        const bindTouch = (id, dir) => {
            const el = document.getElementById(id);
            if(!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); move[dir] = true; }, { passive: false });
            el.addEventListener('touchend', (e) => { e.preventDefault(); move[dir] = false; }, { passive: false });
        };

        bindTouch('btn-up', 'up');
        bindTouch('btn-down', 'down');
        bindTouch('btn-left', 'left');
        bindTouch('btn-right', 'right');

        const actBtn = document.getElementById('action-btn');
        actBtn.addEventListener('touchstart', (e) => { e.preventDefault(); interact(); }, { passive: false });
        actBtn.addEventListener('click', interact);
    }

    socket.on('playerMoved', (data) => {
        if(data.role === 'p1') p1Mesh.position.set(data.x, 0.6, data.z);
        if(data.role === 'p2') p2Mesh.position.set(data.x, 0.6, data.z);
    });

    socket.on('holdingUpdated', (data) => {
        if(data.role !== myRole) {
            updateHoldingVisual(data.role, data.item);
        }
    });

    socket.on('scoreUpdated', (data) => {
        if(data.role === 'p1') document.getElementById('p1-score').innerText = data.score;
        if(data.role === 'p2') document.getElementById('p2-score').innerText = data.score;
    });

    socket.on('timerUpdate', (time) => {
        document.getElementById('timer-box').innerText = time;
    });

    socket.on('gameOver', (scores) => {
        isGameOver = true;
        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('gameover-screen').style.display = 'flex';

        const p1S = scores.p1;
        const p2S = scores.p2;
        let winText = "";

        if(p1S === p2S) winText = "เสมอกัน! " + p1S + " คะแนน";
        else if((myRole === 'p1' && p1S > p2S) || (myRole === 'p2' && p2S > p1S)) winText = "🏆 คุณชนะ! คะแนน: " + (myRole === 'p1' ? p1S : p2S);
        else winText = "❌ คุณแพ้! คะแนนคู่แข่ง: " + (myRole === 'p1' ? p2S : p1S);

        document.getElementById('winner-desc').innerText = winText;
    });

    let lastTime = performance.now();
    function animate(currentTime) {
        requestAnimationFrame(animate);

        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        if(isChopping) {
            chopTimer += delta;
            const progress = Math.min((chopTimer / CHOP_TIME) * 100, 100);
            
            const chopPos = toScreenPosition(chopStation, camera);
            const chopUI = document.getElementById('chop-ui');
            const chopBadge = document.getElementById('chop-badge');

            chopUI.style.display = 'block';
            chopUI.style.left = chopPos.x + 'px';
            chopUI.style.top = (chopPos.y - 20) + 'px';
            document.getElementById('chop-bar').style.width = progress + '%';

            chopBadge.style.display = 'block';
            chopBadge.style.left = chopPos.x + 'px';
            chopBadge.style.top = (chopPos.y - 40) + 'px';

            if(chopTimer >= CHOP_TIME) {
                isChopping = false;
                myHolding = "Chopped";
                document.getElementById('holding-text').innerText = "ผักหั่นแล้ว";
                updateHoldingVisual(myRole, myHolding);
                socket.emit('updateHolding', { roomId: roomId, role: myRole, item: myHolding });

                chopUI.style.display = 'none';
                chopBadge.style.display = 'none';
            }
        }

        const stovePos = toScreenPosition(stoveStation, camera);
        const stoveUI = document.getElementById('stove-ui');
        const stoveBadge = document.getElementById('stove-badge');

        if(stoveState === "กำลังต้ม") {
            stoveTimer += delta;
            const progress = Math.min((stoveTimer / STOVE_TIME) * 100, 100);

            stoveUI.style.display = 'block';
            stoveUI.style.left = stovePos.x + 'px';
            stoveUI.style.top = (stovePos.y - 20) + 'px';
            document.getElementById('stove-bar').style.width = progress + '%';
            document.getElementById('stove-bar').style.background = '#2196f3';

            stoveBadge.style.display = 'block';
            stoveBadge.style.left = stovePos.x + 'px';
            stoveBadge.style.top = (stovePos.y - 40) + 'px';
            stoveBadge.innerText = "กำลังต้ม...";
            stoveBadge.style.background = "rgba(0,0,0,0.8)";

            if(stoveTimer >= STOVE_TIME) {
                stoveState = "สุกแล้ว";
            }
        } else if(stoveState === "สุกแล้ว") {
            stoveUI.style.display = 'block';
            stoveUI.style.left = stovePos.x + 'px';
            stoveUI.style.top = (stovePos.y - 20) + 'px';
            document.getElementById('stove-bar').style.width = '100%';
            document.getElementById('stove-bar').style.background = '#4caf50';

            stoveBadge.style.display = 'block';
            stoveBadge.style.left = stovePos.x + 'px';
            stoveBadge.style.top = (stovePos.y - 40) + 'px';
            stoveBadge.innerText = "สุกแล้ว! (กด E เก็บ)";
            stoveBadge.style.background = "#4caf50";
        } else {
            stoveUI.style.display = 'none';
            stoveBadge.style.display = 'none';
        }

        if(!isGameOver && !isChopping) {
            const myMesh = (myRole === 'p1') ? p1Mesh : p2Mesh;
            const speed = 0.08;
            let moved = false;

            if (move.up && myMesh.position.z > -4) { myMesh.position.z -= speed; moved = true; }
            if (move.down && myMesh.position.z < 4) { myMesh.position.z += speed; moved = true; }
            if (move.left && myMesh.position.x > -5) { myMesh.position.x -= speed; moved = true; }
            if (move.right && myMesh.position.x < 5) { myMesh.position.x += speed; moved = true; }

            if (moved) {
                socket.emit('playerMove', { roomId: roomId, role: myRole, x: myMesh.position.x, z: myMesh.position.z });
            }
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
</script>
</body>
</html>
    `);
});

let waitingQueue = [];
let roomData = {};

io.on('connection', (socket) => {
    socket.on('joi
