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
    <title>3D Cooking Battle - 1v1 Arena</title>
    <style>
        * { box-sizing: border-box; touch-action: none; margin: 0; padding: 0; user-select: none; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #0b0c10; overflow: hidden; color: #fff; }
        
        .overlay-screen {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(11, 12, 16, 0.95); z-index: 100;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            backdrop-filter: blur(10px);
        }
        .start-btn {
            padding: 16px 40px; border: none; border-radius: 30px;
            background: linear-gradient(135deg, #00f2fe, #4facfe); color: #fff;
            font-size: 20px; font-weight: 800; cursor: pointer; text-transform: uppercase;
            box-shadow: 0 0 20px rgba(79, 172, 254, 0.5); transition: 0.2s;
        }
        .start-btn:active { transform: scale(0.95); }
        
        .spinner {
            border: 4px solid rgba(255,255,255,0.1); width: 50px; height: 50px;
            border-radius: 50%; border-left-color: #00f2fe; animation: spin 1s linear infinite; margin-bottom: 20px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        #game-ui { display: none; position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 10; }
        
        .top-bar { 
            position: absolute; top: 20px; left: 20px; right: 20px; 
            display: flex; justify-content: space-between; align-items: center;
        }
        .p-card { 
            background: rgba(255, 255, 255, 0.08); padding: 10px 20px; border-radius: 15px; 
            backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.15);
            display: flex; flex-direction: column; align-items: center;
        }
        .p-card.p1 { border-left: 5px solid #00f2fe; }
        .p-card.p2 { border-left: 5px solid #ff0844; }
        .p-name { font-size: 12px; color: #aaa; font-weight: bold; }
        .p-score { font-size: 22px; font-weight: 900; }

        #timer-box {
            background: linear-gradient(135deg, #ff0844, #ffb199); padding: 10px 25px; border-radius: 25px;
            font-size: 24px; font-weight: 900; box-shadow: 0 0 15px rgba(255, 8, 68, 0.4);
        }

        #item-status {
            position: absolute; top: 85px; left: 20px; 
            background: rgba(0,0,0,0.6); padding: 8px 16px; border-radius: 20px; 
            font-size: 14px; color: #00f2fe; border: 1px solid rgba(0, 242, 254, 0.3);
        }

        /* 3D Progress & Badges */
        .progress-container {
            position: absolute; width: 70px; height: 10px; background: rgba(0,0,0,0.8);
            border: 1px solid rgba(255,255,255,0.4); border-radius: 5px; overflow: hidden; display: none;
            transform: translate(-50%, -50%); pointer-events: none; z-index: 15;
        }
        .progress-bar { width: 0%; height: 100%; background: #00f2fe; }
        
        .status-badge {
            position: absolute; padding: 4px 10px; background: rgba(0,0,0,0.85);
            border-radius: 12px; font-size: 11px; font-weight: bold; color: #fff;
            transform: translate(-50%, -50%); display: none; pointer-events: none; z-index: 15;
            white-space: nowrap; border: 1px solid rgba(255,255,255,0.2);
        }

        /* Controls Mobile */
        .controls { 
            position: absolute; bottom: 25px; left: 25px; 
            display: grid; grid-template-columns: repeat(3, 55px); gap: 8px; 
            pointer-events: auto; z-index: 20; 
        }
        .btn { 
            width: 55px; height: 55px; background: rgba(255,255,255,0.1); 
            border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; 
            color: #fff; display: flex; align-items: center; justify-content: center; 
            font-size: 22px; backdrop-filter: blur(5px);
        }
        .btn:active { background: rgba(255,255,255,0.3); }
        
        #action-btn {
            position: absolute; bottom: 30px; right: 30px;
            width: 80px; height: 80px; 
            background: linear-gradient(135deg, #00f2fe, #4facfe); border: none;
            border-radius: 50%; color: #fff; font-size: 28px; font-weight: 900;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto; z-index: 20; box-shadow: 0 0 25px rgba(0, 242, 254, 0.6);
        }
        #action-btn:active { transform: scale(0.92); }

        #canvas-container { width: 100vw; height: 100vh; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>

<div id="start-screen" class="overlay-screen">
    <h1 style="color: #00f2fe; margin-bottom: 10px; font-size: 32px; text-shadow: 0 0 10px rgba(0,242,254,0.5);">🍳 COOKING BATTLE 1v1</h1>
    <p style="color: #aaa; margin-bottom: 30px;">แบ่งโซนทำอาหารสองฝั่ง แข่งความเร็ว Real-time</p>
    <button class="start-btn" onclick="findOnlinePlayer()">ค้นหาคู่แข่งออนไลน์</button>
</div>

<div id="searching-screen" class="overlay-screen" style="display: none;">
    <div class="spinner"></div>
    <h2 style="margin-bottom: 10px;">กำลังแมตช์ชิ่งผู้เล่น...</h2>
    <p style="color: #aaa; font-size: 14px;">PC: เดิน W A S D / กด E ทำอาหาร | มือถือ: ปุ่มบนหน้าจอ</p>
</div>

<div id="gameover-screen" class="overlay-screen" style="display: none;">
    <h1 id="winner-title" style="color: #00f2fe; margin-bottom: 15px; font-size: 36px;">จบการแข่งขัน!</h1>
    <h2 id="winner-desc" style="margin-bottom: 30px; color: #fff;"></h2>
    <button class="start-btn" onclick="location.reload()">ค้นหาห้องใหม่</button>
</div>

<!-- Progress UIs -->
<div id="p1-chop-ui" class="progress-container"><div id="p1-chop-bar" class="progress-bar"></div></div>
<div id="p1-chop-badge" class="status-badge">กำลังหั่น...</div>

<div id="p1-pot-ui" class="progress-container"><div id="p1-pot-bar" class="progress-bar"></div></div>
<div id="p1-pot-badge" class="status-badge">กำลังต้ม...</div>

<div id="p1-fry-ui" class="progress-container"><div id="p1-fry-bar" class="progress-bar"></div></div>
<div id="p1-fry-badge" class="status-badge">กำลังทอด...</div>

<div id="game-ui">
    <div class="top-bar">
        <div class="p-card p1"><span class="p-name">ฝั่งซ้าย (P1)</span><span class="p-score" id="p1-score">0</span></div>
        <div id="timer-box">90</div>
        <div class="p-card p2"><span class="p-name">ฝั่งขวา (P2)</span><span class="p-score" id="p2-score">0</span></div>
    </div>

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

    let scene, camera, renderer, p1Group, p2Group;
    let stations = {};
    let myHolding = null;
    let myScore = 0;
    let isGameOver = false;

    // สถานะอุปกรณ์ฝั่งเรา
    let stationStates = {
        chop: { active: false, timer: 0, time: 2.0 },
        pot: { state: "ว่าง", timer: 0, time: 3.5 },
        fry: { state: "ว่าง", timer: 0, time: 4.0 }
    };

    let p1ItemMesh, p2ItemMesh;
    const move = { up: false, down: false, left: false, right: false };

    // สร้างตัวละครสไตล์แคปซูล 3D (มีหัวและตา)
    function createHumanoid(colorHex) {
        const group = new THREE.Group();
        
        // ตัว
        const bodyGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.9, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.45;
        group.add(body);

        // หัว
        const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac }); // สีเนื้อ
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.05;
        group.add(head);

        // หมวกเชฟ
        const hatGeo = new THREE.CylinderGeometry(0.3, 0.28, 0.3, 16);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 1.3;
        group.add(hat);

        // ตา (บอกทิศทางด้านหน้า)
        const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
        eye1.position.set(0.1, 1.1, 0.22);
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
        eye2.position.set(-0.1, 1.1, 0.22);
        group.add(eye1); group.add(eye2);

        return group;
    }

    function createFoodMesh(type) {
        let geo, mat;
        if(type === "Raw") {
            geo = new THREE.DodecahedronGeometry(0.2);
            mat = new THREE.MeshStandardMaterial({ color: 0x2ecc71 }); // ผักสดเขียว
        } else if(type === "Chopped") {
            geo = new THREE.BoxGeometry(0.25, 0.08, 0.25);
            mat = new THREE.MeshStandardMaterial({ color: 0xa2de96 }); // ผักหั่น
        } else if(type === "Boiled") {
            geo = new THREE.SphereGeometry(0.2);
            mat = new THREE.MeshStandardMaterial({ color: 0x3498db }); // ซุปผักสีฟ้า
        } else if(type === "Fried") {
            geo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12);
            mat = new THREE.MeshStandardMaterial({ color: 0xe67e22 }); // ผักทอดกรอบส้ม
        } else return null;
        
        const m = new THREE.Mesh(geo, mat);
        m.position.y = 1.6;
        return m;
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

    function init3DScene() {
        const container = document.getElementById('canvas-container');
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0e0e17);

        camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 12, 10);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        const light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(0, 15, 8);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        // พื้นครัวแบ่งสองฝั่ง
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ color: 0x1f1f2e, roughness: 0.8 }));
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // เส้นแบ่งแดนกลาง
        const divider = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 10), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
        divider.rotation.x = -Math.PI / 2;
        divider.position.y = 0.01;
        scene.add(divider);

        // ฟังก์ชันสร้างโต๊ะทำอาหาร
        function createStation(x, z, color, label) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: color }));
            m.position.set(x, 0.4, z);
            scene.add(m);
            return m;
        }

        // โซน P1 (ฝั่งซ้าย: x เป็นลบ)
        stations.p1_crate = createStation(-5.5, -3, 0x2ecc71); // ลังผัก
        stations.p1_chop  = createStation(-3.8, -3, 0xf1c40f); // เขียงหั่น
        stations.p1_pot   = createStation(-2.1, -3, 0xe74c3c); // หม้อต้ม
        stations.p1_fry   = createStation(-0.8, -3, 0xe67e22); // เตาทอด
        stations.p1_serve = createStation(-3.2, 3.5, 0x9b59b6); // จานส่ง

        // โซน P2 (ฝั่งขวา: x เป็นบวก)
        stations.p2_crate = createStation(5.5, -3, 0x2ecc71);
        stations.p2_chop  = createStation(3.8, -3, 0xf1c40f);
        stations.p2_pot   = createStation(2.1, -3, 0xe74c3c);
        stations.p2_fry   = createStation(0.8, -3, 0xe67e22);
        stations.p2_serve = createStation(3.2, 3.5, 0x9b59b6);

        // ตัวละคร P1 & P2
        p1Group = createHumanoid(0x00f2fe);
        p1Group.position.set(-3.2, 0, 0);
        scene.add(p1Group);

        p2Group = createHumanoid(0xff0844);
        p2Group.position.set(3.2, 0, 0);
        scene.add(p2Group);

        setupControls();
        animate();
    }

    function interact() {
        if(isGameOver || stationStates.chop.active) return;
        const myGroup = (myRole === 'p1') ? p1Group : p2Group;
        const prefix = myRole + '_';

        // 1. หยิบผักดิบ
        if(myGroup.position.distanceTo(stations[prefix + 'crate'].position) < 1.5 && !myHolding) {
            myHolding = "Raw";
        }
        // 2. หั่นที่เขียง
        else if(myGroup.position.distanceTo(stations[prefix + 'chop'].position) < 1.5 && myHolding === "Raw") {
            stationStates.chop.active = true;
            stationStates.chop.timer = 0;
        }
        // 3. หม้อต้ม
        else if(myGroup.position.distanceTo(stations[prefix + 'pot'].position) < 1.5) {
            if(myHolding === "Chopped" && stationStates.pot.state === "ว่าง") {
                myHolding = null;
                stationStates.pot.state = "กำลังต้ม";
                stationStates.pot.timer = 0;
            } else if(!myHolding && stationStates.pot.state === "สุกแล้ว") {
                myHolding = "Boiled";
                stationStates.pot.state = "ว่าง";
            }
        }
        // 4. เตาทอด
        else if(myGroup.position.distanceTo(stations[prefix + 'fry'].position) < 1.5) {
            if(myHolding === "Chopped" && stationStates.fry.state === "ว่าง") {
                myHolding = null;
                stationStates.fry.state = "กำลังทอด";
                stationStates.fry.timer = 0;
            } else if(!myHolding && stationStates.fry.state === "สุกแล้ว") {
                myHolding = "Fried";
                stationStates.fry.state = "ว่าง";
            }
        }
        // 5. เสิร์ฟอาหาร
        else if(myGroup.position.distanceTo(stations[prefix + 'serve'].position) < 1.5) {
            if(myHolding === "Boiled") { myHolding = null; myScore += 100; }
            else if(myHolding === "Fried") { myHolding = null; myScore += 150; } // ทอดได้คะแนนเยอะกว่า
            socket.emit('updateScore', { roomId: roomId, role: myRole, score: myScore });
        }

        const textMap = { 'Raw': 'ผักดิบ 🥦', 'Chopped': 'ผักหั่นแล้ว 🔪', 'Boiled': 'ต้มผักสุก 🍲', 'Fried': 'ผักทอดกรอบ 🍟' };
        document.getElementById('holding-text').innerText = textMap[myHolding] || 'ว่างเปล่า';

        updateHoldingVisual(myRole, myHolding);
        socket.emit('updateHolding', { roomId: roomId, role: myRole, item: myHolding });
    }

    function toScreenPosition(obj, camera) {
        var vector = new THREE.Vector3();
        obj.updateMatrixWorld();
        vector.setFromMatrixPosition(obj.matrixWorld);
        vector.y += 1.2;
        vector.project(camera);

        return {
            x: (vector.x * (window.innerWidth / 2)) + (window.innerWidth / 2),
            y: -(vector.y * (window.innerHeight / 2)) + (window.innerHeight / 2)
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

        bindTouch('btn-up', 'up'); bindTouch('btn-down', 'down');
        bindTouch('btn-left', 'left'); bindTouch('btn-right', 'right');

        const actBtn = document.getElementById('action-btn');
        actBtn.addEventListener('touchstart', (e) => { e.preventDefault(); interact(); }, { passive: false });
        actBtn.addEventListener('click', interact);
    }

    socket.on('playerMoved', (data) => {
        const target = (data.role === 'p1') ? p1Group : p2Group;
        if(target) {
            target.position.set(data.x, 0, data.z);
            if(data.rot) target.rotation.y = data.rot;
        }
    });

    socket.on('holdingUpdated', (data) => {
        if(data.role !== myRole) updateHoldingVisual(data.role, data.item);
    });

    socket.on('scoreUpdated', (data) => {
        if(data.role === 'p1') document.getElementById('p1-score').innerText = data.score;
        if(data.role === 'p2') document.getElementById('p2-score').innerText = data.score;
    });

    socket.on('timerUpdate', (time) => document.getElementById('timer-box').innerText = time);

    socket.on('gameOver', (scores) => {
        isGameOver = true;
        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('gameover-screen').style.display = 'flex';

        const p1S = scores.p1, p2S = scores.p2;
        let winText = "";

        if(p1S === p2S) winText = "คะแนนเท่ากัน! " + p1S + " คะแนน";
        else if((myRole === 'p1' && p1S > p2S) || (myRole === 'p2' && p2S > p1S)) winText = "🏆 คุณคือสุดยอดเชฟ! ชนะไปด้วยคะแนน " + (myRole === 'p1' ? p1S : p2S);
        else winText = "❌ พ่ายแพ้! คู่แข่งได้คะแนน " + (myRole === 'p1' ? p2S : p1S);

        document.getElementById('winner-desc').innerText = winText;
    });

    let lastTime = performance.now();
    function animate(currentTime) {
        requestAnimationFrame(animate);

        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        const prefix = myRole + '_';

        // --- หลอดเวลาหั่นผัก ---
        if(stationStates.chop.active) {
            stationStates.chop.timer += delta;
            const progress = Math.min((stationStates.chop.timer / stationStates.chop.time) * 100, 100);
            
            const chopPos = toScreenPosition(stations[prefix + 'chop'], camera);
            const chopUI = document.getElementById('p1-chop-ui'), chopBadge = document.getElementById('p1-chop-badge');

            chopUI.style.display = 'block'; chopUI.style.left = chopPos.x + 'px'; chopUI.style.top = (chopPos.y - 15) + 'px';
            document.getElementById('p1-chop-bar').style.width = progress + '%';

            chopBadge.style.display = 'block'; chopBadge.style.left = chopPos.x + 'px'; chopBadge.style.top = (chopPos.y - 35) + 'px';

            if(stationStates.chop.timer >= stationStates.chop.time) {
                stationStates.chop.active = false;
                myHolding = "Chopped";
                document.getElementById('holding-text').innerText = "ผักหั่นแล้ว 🔪";
                updateHoldingVisual(myRole, myHolding);
                socket.emit('updateHolding', { roomId: roomId, role: myRole, item: myHolding });

                chopUI.style.display = 'none'; chopBadge.style.display = 'none';
            }
        }

        // --- หลอดเวลาหม้อต้ม ---
        const potPos = toScreenPosition(stations[prefix + 'pot'], camera);
        const potUI = document.getElementById('p1-pot-ui'), potBadge = document.getElementById('p1-pot-badge');

        if(stationStates.pot.state === "กำลังต้ม") {
            stationStates.pot.timer += delta;
            const progress = Math.min((stationStates.pot.timer / stationStates.pot.time) * 100, 100);

            potUI.style.display = 'block'; potUI.style.left = potPos.x + 'px'; potUI.style.top = (potPos.y - 15) + 'px';
            document.getElementById('p1-pot-bar').style.width = progress + '%';

            potBadge.style.display = 'block'; potBadge.style.left = potPos.x + 'px'; potBadge.style.top = (potPos.y - 35) + 'px';
            potBadge.innerText = "กำลังต้ม...";

            if(stationStates.pot.timer >= stationStates.pot.time) stationStates.pot.state = "สุกแล้ว";
        } else if(stationStates.pot.state === "สุกแล้ว") {
            potUI.style.display = 'block'; potUI.style.left = potPos.x + 'px'; potUI.style.top = (potPos.y - 15) + 'px';
            document.getElementById('p1-pot-bar').style.width = '100%';

            potBadge.style.display = 'block'; potBadge.style.left = potPos.x + 'px'; potBadge.style.top = (potPos.y - 35) + 'px';
            potBadge.innerText = "ต้มเสร็จแล้ว! (กด E)";
        } else {
            potUI.style.display = 'none'; potBadge.style.display = 'none';
        }

        // --- หลอดเวลาเตาทอด ---
        const fryPos = toScreenPosition(stations[prefix + 'fry'], camera);
        const fryUI = document.getElementById('p1-fry-ui'), fryBadge = document.getElementById('p1-fry-badge');

        if(stationStates.fry.state === "กำลังทอด") {
            stationStates.fry.timer += delta;
            const progress = Math.min((stationStates.fry.timer / stationStates.fry.time) * 100, 100);

            fryUI.style.display = 'block'; fryUI.style.left = fryPos.x + 'px'; fryUI.style.top = (fryPos.y - 15) + 'px';
            document.getElementById('p1-fry-bar').style.width = progress + '%';

            fryBadge.style.display = 'block'; fryBadge.style.left = fryPos.x + 'px'; fryBadge.style.top = (fryPos.y - 35) + 'px';
            fryBadge.innerText = "กำลังทอด...";

            if(stationStates.fry.timer >= stationStates.fry.time) stationStates.fry.state = "สุกแล้ว";
        } else if(stationStates.fry.state === "สุกแล้ว") {
            fryUI.style.display = 'block'; fryUI.style.left = fryPos.x + 'px'; fryUI.style.top = (fryPos.y - 15) + 'px';
            document.getElementById('p1-fry-bar').style.width = '100%';

            fryBadge.style.display = 'block'; fryBadge.style.left = fryPos.x + 'px'; fryBadge.style.top = (fryPos.y - 35) + 'px';
            fryBadge.innerText = "ทอดเสร็จแล้ว! (กด E)";
        } else {
            fryUI.style.display = 'none'; fryBadge.style.display = 'none';
        }

        // --- การเคลื่อนที่ ---
        if(!isGameOver && !stationStates.chop.active) {
            const myGroup = (myRole === 'p1') ? p1Group : p2Group;
            const speed = 0.08;
            let moved = false;
            let targetRot = myGroup.rotation.y;

            // ขอบเขตตามโซนฝั่งตัวเอง
            const minX = (myRole === 'p1') ? -6.5 : 0.2;
            const maxX = (myRole === 'p1') ? -0.2 : 6.5;

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

let waitingQueue = [];
let roomData = {};

io.on('connection', (socket) => {
    socket.on('joinMatchmaking', () => {
        if (!waitingQueue.includes(socket.id)) {
            waitingQueue.push(socket.id);
        }

        if (waitingQueue.length >= 2) {
            const p1Socket = waitingQueue.shift();
            const p2Socket = waitingQueue.shift();
            const roomId = 'room_' + Date.now();

            roomData[roomId] = { p1Score: 0, p2Score: 0, timeLeft: 90 };

            io.to(p1Socket).emit('matchStart', { roomId: roomId, role: 'p1' });
            io.to(p2Socket).emit('matchStart', { roomId: roomId, role: 'p2' });

            const timerInterval = setInterval(() => {
                if(roomData[roomId]) {
                    roomData[roomId].timeLeft--;
                    io.emit('timerUpdate', roomData[roomId].timeLeft);

                    if(roomData[roomId].timeLeft <= 0) {
                        clearInterval(timerInterval);
                        io.emit('gameOver', { p1: roomData[roomId].p1Score, p2: roomData[roomId].p2Score });
                        delete roomData[roomId];
                    }
                } else {
                    clearInterval(timerInterval);
                }
            }, 1000);
        }
    });

    socket.on('playerMove', (data) => {
        socket.broadcast.emit('playerMoved', data);
    });

    socket.on('updateHolding', (data) => {
        socket.broadcast.emit('holdingUpdated', data);
    });

    socket.on('updateScore', (data) => {
        if(roomData[data.roomId]) {
            if(data.role === 'p1') roomData[data.roomId].p1Score = data.score;
            if(data.role === 'p2') roomData[data.roomId].p2Score = data.score;
        }
        io.emit('scoreUpdated', data);
    });

    socket.on('disconnect', () => {
        waitingQueue = waitingQueue.filter(id => id !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Server running on port ' + PORT));
