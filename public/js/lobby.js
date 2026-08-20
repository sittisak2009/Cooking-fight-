const socket = io();
let myRole = '', roomId = '';
let isReady = false;
let isInRoom = false;

function handleMainButtonClick() {
    const name = document.getElementById('username-input').value.trim() || 'Chef';
    if (!isInRoom) {
        document.getElementById('main-btn').innerText = 'กำลังค้นหา...';
        document.getElementById('main-btn').disabled = true;
        socket.emit('findMatch', { name: name });
    }
}

function toggleReady() {
    isReady = !isReady;
    const readyBtn = document.getElementById('ready-btn');
    if (isReady) {
        readyBtn.innerText = 'ยกเลิกพร้อม';
        readyBtn.className = 'btn-action btn-cancel';
    } else {
        readyBtn.innerText = 'พร้อมแข่ง!';
        readyBtn.className = 'btn-action btn-ready';
    }
    socket.emit('toggleReady', { roomId: roomId, role: myRole, isReady: isReady });
}

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
    if (data.p1) {
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

    if (data.p2) {
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
