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
    <title>3D Cooking Battle - Lobby System</title>
    <style>
        * { box-sizing: border-box; touch-action: none; margin: 0; padding: 0; user-select: none; font-family: 'Segoe UI', Roboto, sans-serif; }
        body { background: #0b0c10; overflow: hidden; color: #fff; }
        
        .overlay-screen {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: space-between;
            padding: 30px 20px; background: linear-gradient(180deg, rgba(11,12,16,0.4) 0%, rgba(11,12,16,0.85) 100%);
            backdrop-filter: blur(4px);
        }

        /* Top Header in Lobby */
        .lobby-header {
            width: 100%; max-width: 800px; display: flex; justify-content: space-between; align-items: center;
            background: rgba(0, 0, 0, 0.6); padding: 12px 24px; border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .game-title { font-size: 22px; font-weight: 900; color: #00f2fe; text-shadow: 0 0 10px rgba(0,242,254,0.6); }
        .room-tag { background: #ff0844; padding: 6px 14px; border-radius: 12px; font-weight: 800; font-size: 14px; letter-spacing: 1px; }

        /* Middle Section: Player Slots */
        .lobby-center {
            width: 100%; max-width: 800px; display: flex; justify-content: space-between; align-items: center; margin: auto 0;
        }
        .player-slot {
            width: 220px; background: rgba(20, 24, 33, 0.75); border-radius: 20px; padding: 16px;
            border: 2px dashed rgba(255, 255, 255, 0.2); text-align: center; transition: 0.3s;
            box-shadow: 0 10px 25px rgba(0,0,0,0.4); backdrop-filter: blur(10px);
        }
        .player-slot.active { border: 2px solid #00f2fe; background: rgba(0, 242, 254, 0.08); box-shadow: 0 0 20px rgba(0,242,254,0.3); }
        .player-slot.p2-active { border: 2px solid #ff0844; background: rgba(255, 8, 68, 0.08); box-shadow: 0 0 20px rgba(255,8,68,0.3); }
        
        .avatar-box {
            width: 80px; height: 80px; margin: 0 auto 12px; border-radius: 50%;
            background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;
            font-size: 36px; border: 2px solid rgba(255,255,255,0.2);
        }
        .slot-name { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
        .slot-status { font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 10px; display: inline-block; }
        .status-waiting { background: rgba(255,255,255,0.1); color: #aaa; }
        .status-ready { background: #00e676; color: #000; box-shadow: 0 0 10px rgba(0,230,118,0.5); }

        /* Bottom Control Panel */
        .lobby-bottom {
            width: 100%; max-width: 800px; display: flex; gap: 15px; justify-content: center; align-items: center;
        }
        .input-name {
            background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
            padding: 14px 20px; border-radius: 25px; color: #fff; font-size: 16px; font-weight: bold;
            outline: none; text-align: center; width: 200px;
        }
        .btn-action {
            padding: 16px 36px; border: none; border-radius: 30px; font-size: 18px; font-weight: 900;
            cursor: pointer; text-transform: uppercase; transition: 0.2s; box-shadow: 0 0 20px rgba(0,0,0,0.4);
        }
        .btn-primary { background: linear-gradient(135deg, #00f2fe, #4facfe); color: #fff; box-shadow: 0 0 20px rgba(0,242,254,0.4); }
        .btn-ready { background: linear-gradient(135deg, #00e676, #1de9b6); color: #000; box-shadow: 0 0 20px rgba(0,230,118,0.4); }
        .btn-cancel { background: linear-gradient(135deg, #ff0844, #ffb199); color: #fff; }
        .btn-action:active { transform: scale(0.95); }

        /* In-Game UI Elements */
        #game-ui { display: none; position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 10; }
        .top-bar { position: absolute; top: 15px; left: 15px; right: 15px; display: flex; justify-content: space-between; align-items: flex-start; }
        .p-card { background: rgba(255, 255, 255, 0.08); padding: 8px 16px; border-radius: 12px; backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.15); display: flex; flex-direction: column; align-items: center; }
        .p-card.p1 { border-left: 4px solid #00f2fe; } .p-card.p2 { border-left: 4px solid #ff0844; }
        .p-name { font-size: 11px; color: #aaa; font-weight: bold; }
        .p-score { font-size: 20px; font-weight: 900; }
        #timer-box { background: linear-gradient(135deg, #ff0844, #ffb199); padding: 8px 20px; border-radius: 20px; font-size: 20px; font-weight: 900; box-shadow: 0 0 15px rgba(255, 8, 68, 0.4); }
        #order-container { position: absolute; top: 70px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; pointer-events: none; }
        .order-card { background: rgba(0, 0, 0, 0.85); border: 2px solid #ffc107; padding: 6px 14px; border-radius: 15px; font-size: 13px; font-weight: bold; color: #ffc107; box-shadow: 0 0 10px rgba(255, 193, 7, 0.4); }
        #item-status { position: absolute; top: 75px; left: 15px; background: rgba(0,0,0,0.6); padding: 6px 12px; border-radius: 15px; font-size: 13px; color: #00f2fe; border: 1px solid rgba(0, 242, 254, 0.3); }
        .progress-container { position: absolute; width: 70px; height: 10px; background: rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.4); border-radius: 5px; overflow: hidden; display: none; transform: translate(-50%, -50%); pointer-events: none; z-index: 15; }
        .progress-bar { width: 0%; height: 100%; background: #00f2fe; }
        .status-badge { position: absolute; padding: 4px 10px; background: rgba(0,0,0,0.85); border-radius: 12px; font-size: 11px; font-weight: bold; color: #fff; transform: translate(-50%, -50%); display: none; pointer-events: none; z-index: 15; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2); }
        .controls { position: absolute; bottom: 25px; left: 25px; display: grid; grid-template-columns: repeat(3, 55px); gap: 8px; pointer-events: auto; z-index: 20; }
        .btn { width: 55px; height: 55px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; backdrop-filter: blur(5px); }
        .btn:active { background: rgba(255,255,255,0.3); }
        #action-btn { position: absolute; bottom: 30px; right: 30px; width: 80px; height: 80px; background: linear-gradient(135deg, #00f2fe, #4facfe); border: none; border-radius: 50%; color: #fff; font-size: 28px; font-weight: 900; display: flex; align-items: center; justify-content: center; pointer-events: auto; z-index: 20; box-shadow: 0 0 25px rgba(0, 242, 254, 0.6); }
        #canvas-container { width: 100vw; height: 100vh; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>

<!-- Cooking Battle Main Lobby Overlay -->
<div id="lobby-screen" class="overlay-screen">
    <div class="lobby-header">
        <div class="game-title">🍳 COOKING BATTLE</div>
        <div class="room-tag" id="room-id-tag">MATCHMAKING</div>
    </div>

    <div class="lobby-center">
        <!-- Player 1 Slot -->
        <div class="player-slot active" id="slot-p1">
            <div class="avatar-box">👨‍🍳</div>
            <div class="slot-name" id="p1-name-display">รอผู้เล่น...</div>
            <div class="slot-status status-waiting" id="p1-status">NOT READY</div>
        </div>

        <!-- Player 2 Slot -->
        <div class="player-slot" id="slot-p2">
            <div class="avatar-box">👩‍🍳</div>
            <div class="slot-name" id="p2-name-display">รอผู้เล่น...</div>
            <div class="slot-status status-waiting" id="p2-status">NOT READY</div>
        </div>
    </div>

    <div class="lobby-bottom">
        <input type="text" id="username-input" class="input-name" placeholder="ชื่อเชฟของคุณ" maxlength="10" value="Chef_King">
        <button class="btn-action btn-primary" id="main-btn" onclick="handleMainButtonClick()">ค้นหาห้องแข่ง</button>
        <button class="btn-action btn-ready" id="ready-btn" onclick="toggleReady()" style="display: none;">พร้อมแข่ง!</button>
    </div>
</div>

<div id="gameover-screen" class="overlay-screen" style="display: none; justify-content: center;">
    <h1 id="winner-title" style="color: #00f2fe; margin-bottom: 15px; font-size: 36px;">หมดเวลาแข่งขัน!</h1>
    <h2 id="winner-desc" style="margin-bottom: 30px; color: #fff;"></h2>
    <button class="btn-action btn-primary" onclick="location.reload()">กลับสู่ลอบบี้</button>
</div>

<div id="p1-chop-ui" class="progress-container"><div id="p1-chop-bar" class="progress-bar"></div></div>
<div id="p1-chop-badge" class="status-badge">กำลังหั่น...</div>
<div id="p1-pot-ui" class="progress-container"><div id="p1-pot-bar" class="progress-bar"></div></div>
<div id="p1-pot-badge" class="status-badge">กำลังต้ม...</div>
<div id="p1-fry-ui" class="progress-container"><div id="p1-fry-bar" class="progress-bar"></div></div>
<div id="p1-fry-badge" class="status-badge">กำลังทอด...</div>

<div id="game-ui">
    <div class="top-bar">
        <div class="p-card p1"><span class="p-name" id="hud-p1-name">P1</span><span class="p-score" id="p1-score">0</span></div>
        <div id="timer-box">180</div>
        <div class="p-card p2"><span class="p-name" id="hud-p2-name">P2</span><span class="p-score" id="p2-score">0</span></div>
    </div>
    <div id="order-container"><div class="order-card" id="current-order">ออเดอร์: กำลังโหลด...</div></div>
    <div id="item-status">ในมือ: <span id="holding-text" style="color:#fff;">ว่างเปล่า</span></div>
    
    <div class="controls">
        <div></div><div class="btn" id="btn-up">▲</div><div></div>
        <div class="btn" id="btn-left">◀</div><div class="btn" id="btn-down">▼</div><div class="btn" id="btn-right">▶</div>
    </div>
    <div id="action-btn">E</div>
</div>

<div id="canvas-container"></div>

<script>
    const socket = io();
    let myRole = '', roomId = '';
    let currentOrder = '';
    let isReady = false;
    let isInRoom = false;

    const orderNames = { 'Chopped': 'ผักหั่น 🔪', 'Boiled': 'ซุปผักต้ม 🍲', 'Fried': 'ผักทอดกรอบ 🍟' };

    // --- Lobby Flow Functions ---
    function handleMainButtonClick() {
        const name = document.getElementById('username-input').value.trim() || 'Chef';
        if(!isInRoom) {
            document.getElementById('main-btn').innerText = 'กำลังค้นหา...';
            document.getElementById('main-btn').disabled = true;
            socket.emit('findMatch', { name: name });
        }
    }

    function toggleReady() {
        isReady = !isReady;
        const readyBtn = document.getElementById('ready-btn');
        if(isReady) {
            readyBtn.innerText = 'ยกเลิกพร้อม';
            readyBtn.className = 'btn-action btn-cancel';
        } else {
            readyBtn.innerText = 'พร้อมแข่ง!';
            readyBtn.className = 'btn-action btn-ready';
        }
        socket.emit('toggleReady', { roomId: roomId, role: myRole, isReady: isReady });
    }

    // --- Socket Lobby Events ---
    socket.on('joinedRoom', (data) => {
        isInRoom = true;
        myRole = data.role;
        roomId = data.roomId;
        document.getElementById('room-id-tag').innerText = 'ROOM: ' + roomId;
        document.getElementById('main-btn').style.display = 'none';
        document.getElementById('username-input').style.display = 'none';
        document.getElementById('ready-btn').style.display = 'inline-block';
    });

    socket.on('lobbyUpdate', (data) => {
        // Update P1
        if(data.p1) {
            document.getElementById('p1-name-display').innerText = data.p1.name;
            document.getElementById('hud-p1-name').innerText = data.p1.name;
            const p1Stat = document.getElementById('p1-status');
            p1Stat.innerText = data.p1.isReady ? 'READY!' : 'NOT READY';
            p1Stat.className = data.p1.isReady ? 'slot-status status-ready' : 'slot-status status-waiting';
        } else {
            document.getElementById('p1-name-display').innerText = 'รอผู้เล่น...';
            document.getElementById('p1-status').innerText = 'NOT READY';
            document.getElementById('p1-status').className = 'slot-status status-waiting';
        }

        // Update P2
        if(data.p2) {
            document.getElementById('slot-p2').classList.add('p2-active');
            document.getElementById('p2-name-display').innerText = data.p2.name;
            document.getElementById('hud-p2-name').innerText = data.p2.name;
            const p2Stat = document.getElementById('p2-status');
            p2Stat.innerText = data.p2.isReady ? 'READY!' : 'NOT READY';
            p2Stat.className = data.p2.isReady ? 'slot-status status-ready' : 'slot-status status-waiting';
        } else {
            document.getElementById('slot-p2').classList.remove('p2-active');
            document.getElementById('p2-name-display').innerText = 'รอผู้เล่น...';
            document.getElementById('p2-status').innerText = 'NOT READY';
            document.getElementById('p2-status').className = 'slot-status status-waiting';
        }
    });

    socket.on('gameStart', () => {
        document.getElementById('lobby-screen').style.display = 'none';
        document.getElementById('game-ui').style.display = 'block';
        init3DScene();
    });

    // --- 3D Scene & Game Engine ---
    let scene, camera, renderer, p1Group, p2Group;
    let stations = {};
    let myHolding = null, myScore = 0, isGameOver = false;
    let opponentTarget = { x: 0, z: 0, rot: 0 };
    let stationStates = {
        chop: { active: false, timer: 0, time: 2.0 },
        pot: { state: "ว่าง", timer: 0, time: 3.5 },
        fry: { state: "ว่าง", timer: 0, time: 4.0 }
    };
    let p1ItemMesh, p2ItemMesh;
    const move = { up: false, down: false, left: false, right: false };

    function createHumanoid(colorHex) {
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.9, 16), new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3 }));
        body.position.y = 0.45; group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
        head.position.y = 1.05; group.add(head);
        const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        hat.position.y = 1.3; group.add(hat);
        const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8), eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat); eye1.position.set(0.1, 1.1, 0.22);
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat); eye2.position.set(-0.1, 1.1, 0.22);
        group.add(eye1); group.add(eye2);
        return group;
    }

    function createFoodMesh(type) {
        const group = new THREE.Group();
        if(type === "Raw") {
            const veg = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25), new THREE.MeshStandardMaterial({ color: 0x2ecc71 }));
            group.add(veg);
        } else if(type === "Chopped") {
            for(let i=0; i<3; i++) {
                const piece = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), new THREE.MeshStandardMaterial({ color: 0xa2de96 }));
                piece.position.set((i-1)*0.1, 0, 0); group.add(piece);
            }
        } else if(type === "Boiled") {
            const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x3498db }));
            soup.position.y = 0.06; group.add(bowl); group.add(soup);
        } else if(type === "Fried") {
            const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
            const food = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), new THREE.MeshStandardMaterial({ color: 0xe67e22 }));
            food.position.y = 0.08; group.add(plate); group.add(food);
        } else return null;
        group.position.y = 1.6; return group;
    }

    function updateHoldingVisual(role, itemType) {
        const targetGroup = (role === 'p1') ? p1Group : p2Group;
        if(role === 'p1' && p1ItemMesh) { p1Group.remove(p1ItemMesh); p1ItemMesh = null; }
        if(role === 'p2' && p2ItemMesh) { p2Group.remove(p2ItemMesh); p2ItemMesh = null; }
        if(itemType) {
            const newItem = createFoodMesh(itemType);
            if(newItem) {
                targetGroup.add(newItem);
                if(role === 'p1') p1ItemMesh = newItem;
                if(role === 'p2') p2ItemMesh = newItem;
            }
        }
    }

    function createStation(x, z, type) {
        const group = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.3), new THREE.MeshStandardMaterial({ color: 0x333344 }));
        base.position.y = 0.4; group.add(base);

        if(type === 'crate') {
            const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.0), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
            box.position.y = 0.9; group.add(box);
        } else if(type === 'chop') {
            const board = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xd7ccc8 }));
            board.position.y = 0.84;
            const knife = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
            knife.position.set(0.2, 0.95, 0); group.add(board); group.add(knife);
        } else if(type === 'pot') {
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.5 }));
            pot.position.y = 1.05;
            const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x3498db }));
            liquid.position.y = 1.26; group.add(pot); group.add(liquid);
        } else if(type === 'fry') {
            const fryer = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.9), new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.8 }));
            fryer.position.y = 1.0;
            const oil = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.8), new THREE.MeshStandardMaterial({ color: 0xf39c12 }));
            oil.position.y = 1.2; group.add(fryer); group.add(oil);
        } else if(type === 'serve') {
            const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x9b59b6 }));
            mat.position.y = 0.83; group.add(mat);
        }

        group.position.set(x, 0, z); scene.add(group); return group;
    }

    function init3DScene() {
        const container = document.getElementById('canvas-container');
        scene = new THREE.Scene(); scene.background = new THREE.Color(0x0e0e17);

        camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 12, 10); camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        const light = new THREE.DirectionalLight(0xffffff, 1.2); light.position.set(0, 15, 8); scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ color: 0x1f1f2e, roughness: 0.8 }));
        floor.rotation.x = -Math.PI / 2; scene.add(floor);

        const divider = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 10), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
        divider.rotation.x = -Math.PI / 2; divider.position.y = 0.01; scene.add(divider);

        stations.p1_crate = createStation(-5.5, -3, 'crate'); stations.p1_chop = createStation(-3.8, -3, 'chop');
        stations.p1_pot   = createStation(-2.1, -3, 'pot');   stations.p1_fry  = createStation(-0.8, -3, 'fry');
        stations.p1_serve = createStation(-3.2, 3.5, 'serve');

        stations.p2_crate = createStation(5.5, -3, 'crate');  stations.p2_chop = createStation(3.8, -3, 'chop');
        stations.p2_pot   = createStation(2.1, -3, 'pot');    stations.p2_fry  = createStation(0.8, -3, 'fry');
        stations.p2_serve = createStation(3.2, 3.5, 'serve');

        p1Group = createHumanoid(0x00f2fe); p1Group.position.set(-3.2, 0, 0); scene.add(p1Group);
        p2Group = createHumanoid(0xff0844); p2Group.position.set(3.2, 0, 0); scene.add(p2Group);

        opponentTarget = { x: myRole === 'p1' ? 3.2 : -3.2, z: 0, rot: 0 };
        setupControls(); animate();
    }

    function interact() {
        if(isGameOver || stationStates.chop.active) return;
        const myGroup = (myRole === 'p1') ? p1Group : p2Group;
        const prefix = myRole + '_';

        if(myGroup.position.distanceTo(stations[prefix + 'crate'].position) < 1.5 && !myHolding) {
            myHolding = "Raw";
        } else if(myGroup.position.distanceTo(stations[prefix + 'chop'].position) < 1.5 && myHolding === "Raw") {
            stationStates.chop.active = true; stationStates.chop.timer = 0;
        } else if(myGroup.position.distanceTo(stations[prefix + 'pot'].position) < 1.5) {
            if(myHolding === "Chopped" && stationStates.pot.state === "ว่าง") {
                myHolding = null; stationStates.pot.state = "กำลังต้ม"; stationStates.pot.timer = 0;
            } else if(!myHolding && stationStates.pot.state === "สุกแล้ว") {
                myHolding = "Boiled"; stationStates.pot.state = "ว่าง";
            }
        } else if(myGroup.position.distanceTo(stations[prefix + 'fry'].position) < 1.5) {
            if(myHolding === "Chopped" && stationStates.fry.state === "ว่าง") {
                myHolding = null; stationStates.fry.state = "กำลังทอด"; stationStates.fry.timer = 0;
            } else if(!myHolding && stationStates.fry.state === "สุกแล้ว") {
                myHolding = "Fried"; stationStates.fry.state = "ว่าง";
            }
        } else if(myGroup.position.distanceTo(stations[prefix + 'serve'].position) < 1.5 && myHolding) {
            if(myHolding === currentOrder) {
                myScore += 200;
                socket.emit('updateScore', { roomId: roomId, role: myRole, score: myScore });
                socket.emit('completeOrder', { roomId: roomId });
            }
            myHolding = null;
        }

        const textMap = { 'Raw': 'ผักดิบ 🥦', 'Chopped': 'ผักหั่น 🔪', 'Boiled': 'ซุปผัก 🍲', 'Fried': 'ผักทอด 🍟' };
        document.getElementById('holding-text').innerText = textMap[myHolding] || 'ว่างเปล่า';
        updateHoldingVisual(myRole, myHolding);
        socket.emit('updateHolding', { roomId: roomId, role: myRole, item: myHolding });
    }

    function toScreenPosition(obj, camera) {
        var vector = new THREE.Vector3(); obj.updateMatrixWorld(); vector.setFromMatrixPosition(obj.matrixWorld); vector.y += 1.2; vector.project(camera);
        return { x: (vector.x * (window.innerWidth / 2)) + (window.innerWidth / 2), y: -(vector.y * (window.innerHeight / 2)) + (window.innerHeight / 2) };
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
            const el = document.getElementById(id); if(!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); move[dir] = true; }, { passive: false });
            el.addEventListener('touchend', (e) => { e.preventDefault(); move[dir] = false; }, { passive: false });
        };
        bindTouch('btn-up', 'up'); bindTouch('btn-down', 'down'); bindTouch('btn-left', 'left'); bindTouch('btn-right', 'right');
        const actBtn = document.getElementById('action-btn');
        actBtn.addEventListener('touchstart', (e) => { e.preventDefault(); interact(); }, { passive: false });
        actBtn.addEventListener('click', interact);
    }

    socket.on('playerMoved', (data) => { if(data.role !== myRole) { opponentTarget.x = data.x; opponentTarget.z = data.z; opponentTarget.rot = data.rot; } });
    socket.on('holdingUpdated', (data) => { if(data.role !== myRole) updateHoldingVisual(data.role, data.item); });
    socket.on('scoreUpdated', (data) => {
        if(data.role === 'p1') document.getElementById('p1-score').innerText = data.score;
        if(data.role === 'p2') document.getElementById('p2-score').innerText = data.score;
    });
    socket.on('newOrder', (order) => { currentOrder = order; document.getElementById('current-order').innerText = "ออเดอร์: " + (orderNames[order] || order); });
    socket.on('timerUpdate', (time) => document.getElementById('timer-box').innerText = time);
    socket.on('gameOver', (scores) => {
        isGameOver = true; document.getElementById('game-ui').style.display = 'none'; document.getElementById('gameover-screen').style.display = 'flex';
        const p1S = scores.p1, p2S = scores.p2; let winText = "";
        if(p1S === p2S) winText = "คะแนนเท่ากัน! " + p1S + " คะแนน";
        else if((myRole === 'p1' && p1S > p2S) || (myRole === 'p2' && p2S > p1S)) winText = "🏆 ชนะออเดอร์! คะแนนของคุณ: " + (myRole === 'p1' ? p1S : p2S);
        else winText = "❌ แพ้คะแนนออเดอร์! คู่แข่งได้: " + (myRole === 'p1' ? p2S : p1S);
        document.getElementById('winner-desc').innerText = winText;
    });

    let lastTime = performance.now();
    function animate(currentTime) {
        requestAnimationFrame(animate);
        const delta = (currentTime - lastTime) / 1000; lastTime = currentTime;
        const prefix = myRole + '_';

        const opGroup = (myRole === 'p1') ? p2Group : p1Group;
        if(opGroup) {
            opGroup.position.x += (opponentTarget.x - opGroup.position.x) * 0.25;
            opGroup.position.z += (opponentTarget.z - opGroup.position.z) * 0.25;
            opGroup.rotation.y += (opponentTarget.rot - opGroup.rotation.y) * 0.25;
        }

        if(stationStates.chop.active) {
            stationStates.chop.timer += delta;
            const progress = Math.min((stationStates.chop.timer / stationStates.chop.time) * 100, 100);
            const chopPos = toScreenPosition(stations[prefix + 'chop'], camera);
            const chopUI = document.getElementById('p1-chop-ui'), chopBadge = document.getElementById('p1-chop-badge');
            chopUI.style.display = 'block'; chopUI.style.left = chopPos.x + 'px'; chopUI.style.top = (chopPos.y - 15) + 'px';
            document.getElementById('p1-chop-bar').style.width = progress + '%';
            chopBadge.style.display = 'block'; chopBadge.style.left = chopPos.x + 'px'; chopBadge.style.top = (chopPos.y - 35) + 'px';

            if(stationStates.chop.timer >= stationStates.chop.time) {
                stationStates.chop.active = false; myHolding = "Chopped";
                document.getElementById('holding-text').innerText = "ผักหั่น 🔪";
                updateHoldingVisual(myRole, myHolding);
                socket.emit('updateHolding', { roomId: roomId, role: myRole, item: myHolding });
                chopUI.style.display = 'none'; chopBadge.style.display = 'none';
            }
        }

        const potPos = toScreenPosition(stations[prefix + 'pot'], camera);
        const potUI = document.getElementById('p1-pot-ui'), potBadge = document.getElementById('p1-pot-badge');
        if(stationStates.pot.state === "กำลังต้ม") {
            stationStates.pot.timer += delta;
            const progress = Math.min((stationStates.pot.timer / stationStates.pot.time) * 100, 100);
            potUI.style.display = 'block'; potUI.style.left = potPos.x + 'px'; potUI.style.top = (potPos.y - 15) + 'px';
            document.getElementById('p1-pot-bar').style.width = progress + '%';
            potBadge.style.display = 'block'; potBadge.style.left = potPos.x + 'px'; potBadge.style.top = (potPos.y - 35) + 'px'; potBadge.innerText = "กำลังต้ม...";
            if(stationStates.pot.timer >= stationStates.pot.time) stationStates.pot.state = "สุกแล้ว";
        } else if(stationStates.pot.state === "สุกแล้ว") {
            potUI.style.display = 'block'; potUI.style.left = potPos.x + 'px'; potUI.style.top = (potPos.y - 15) + 'px';
            document.getElementById('p1-pot-bar').style.width = '100%';
            potBadge.style.display = 'block'; potBadge.style.left = potPos.x + 'px'; potBadge.style.top = (potPos.y - 35) + 'px'; potBadge.innerText = "ซุปสุกแล้ว! (กด E)";
        } else { potUI.style.display = 'none'; potBadge.style.display = 'none'; }

        const fryPos = toScreenPosition(stations[prefix + 'fry'], camera);
        const fryUI = document.getElementById('p1-fry-ui'), fryBadge = document.getElementById('p1-fry-badge');
        if(stationStates.fry.state === "กำลังทอด") {
            stationStates.fry.timer += delta;
            const progress = Math.min((stationStates.fry.timer / stationStates.fry.time) * 100, 100);
            fryUI.style.display = 'block'; fryUI.style.left = fryPos.x + 'px'; fryUI.style.top = (fryPos.y - 15) + 'px';
            document.getElementById('p1-fry-bar').style.width = progress + '%';
            fryBadge.style.display = 'block'; fryBadge.style.left = fryPos.x + 'px'; fryBadge.style.top = (fryPos.y - 35) + 'px'; fryBadge.innerText = "กำลังทอด...";
            if(stationStates.fry.timer >= stationStates.fry.time) stationStates.fry.state = "สุกแล้ว";
        } else if(stationStates.fry.state === "สุกแล้ว") {
            fryUI.style.display = 'block'; fryUI.style.left = fryPos.x + 'px'; fryUI.style.top = (fryPos.y - 15) + 'px';
            document.getElementById('p1-fry-bar').style.width = '100%';
            fryBadge.style.display = 'block'; fryBadge.style.left = fryPos.x + 'px'; fryBadge.style.top = (fryPos.y - 35) + 'px'; fryBadge.innerText = "ทอดสุกแล้ว! (กด E)";
        } else { fryUI.style.display = 'none'; fryBadge.style.display = 'none'; }

        if(!isGameOver && !stationStates.chop.active) {
            const myGroup = (myRole === 'p1') ? p1Group : p2Group;
            const speed = 0.08; let moved = false; let targetRot = myGroup.rotation.y;
            const minX = (myRole === 'p1') ? -6.5 : 0.2; const maxX = (myRole === 'p1') ? -0.2 : 6.5;

            if (move.up && myGroup.position.z > -4) { myGroup.position.z -= speed; targetRot = Math.PI; moved = true; }
            if (move.down && myGroup.position.z < 4) { myGroup.position.z += speed; targetRot = 0; moved = true; }
            if (move.left && myGroup.position.x > minX) { myGroup.position.x -= speed; targetRot = -Math.PI / 2; moved = true; }
            if (move.right && myGroup.position.x < maxX) { myGroup.position.x += speed; targetRot = Math.PI / 2; moved = true; }

            if (moved) {
                myGroup.rotation.y = targetRot;
                socket.emit('playerMove', { roomId: roomId, role: myRole, x: myGroup.position.x, z: myGroup.position.z, rot: targetRot });
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

// --- Server Matchmaking Logic ---
let waitingQueue = [];
let roomData = {};

const possibleOrders = ['Chopped', 'Boiled', 'Fried'];
function getRandomOrder() { return possibleOrders[Math.floor(Math.random() * possibleOrders.length)]; }

io.on('connection', (socket) => {
    socket.on('findMatch', (data) => {
        socket.playerName = data.name;
        waitingQueue.push(socket);

        if (waitingQueue.length >= 2) {
            const p1 = waitingQueue.shift();
            const p2 = waitingQueue.shift();
            const roomId = 'ROOM_' + Math.floor(1000 + Math.random() * 9000);

            roomData[roomId] = {
                p1: { id: p1.id, name: p1.playerName, isReady: false, score: 0 },
                p2: { id: p2.id, name: p2.playerName, isReady: false, score: 0 },
                timeLeft: 180,
                currentOrder: getRandomOrder()
            };

            p1.join(roomId); p2.join(roomId);
            p1.emit('joinedRoom', { roomId: roomId, role: 'p1' });
            p2.emit('joinedRoom', { roomId: roomId, role: 'p2' });

            io.to(roomId).emit('lobbyUpdate', roomData[roomId]);
        }
    });

    socket.on('toggleReady', (data) => {
        const room = roomData[data.roomId];
        if(room) {
            if(data.role === 'p1') room.p1.isReady = data.isReady;
            if(data.role === 'p2') room.p2.isReady = data.isReady;

            io.to(data.roomId).emit('lobbyUpdate', room);

            // เริ่มเกมอัตโนมัติเมื่อทั้งคู่ Ready
            if(room.p1.isReady && room.p2.isReady) {
                io.to(data.roomId).emit('gameStart');
                io.to(data.roomId).emit('newOrder', room.currentOrder);

                const timerInterval = setInterval(() => {
                    if(roomData[data.roomId]) {
                        roomData[data.roomId].timeLeft--;
                        io.to(data.roomId).emit('timerUpdate', roomData[data.roomId].timeLeft);

                        if(roomData[data.roomId].timeLeft <= 0) {
                            clearInterval(timerInterval);
                            io.to(data.roomId).emit('gameOver', { p1: roomData[data.roomId].p1.score, p2: roomData[data.roomId].p2.score });
                            delete roomData[data.roomId];
                        }
                    } else {
                        clearInterval(timerInterval);
                    }
                }, 1000);
            }
        }
    });

    socket.on('playerMove', (data) => socket.to(data.roomId).emit('playerMoved', data));
    socket.on('updateHolding', (data) => socket.to(data.roomId).emit('holdingUpdated', data));

    socket.on('updateScore', (data) => {
        if(roomData[data.roomId]) {
            if(data.role === 'p1') roomData[data.roomId].p1.score = data.score;
            if(data.role === 'p2') roomData[data.roomId].p2.score = data.score;
        }
        io.to(data.roomId).emit('scoreUpdated', data);
    });

    socket.on('completeOrder', (data) => {
        if(roomData[data.roomId]) {
            const nextOrder = getRandomOrder();
            roomData[data.roomId].currentOrder = nextOrder;
            io.to(data.roomId).emit('newOrder', nextOrder);
        }
    });

    socket.on('disconnect', () => {
        waitingQueue = waitingQueue.filter(s => s.id !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Cooking Battle Lobby Server active on port ' + PORT));
