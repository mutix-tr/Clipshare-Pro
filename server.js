const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map(); // roomId => { name, password, current, history, members }

app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ===================== SOCKET.IO =====================
io.on('connection', (socket) => {
    console.log('📱 Bağlandı:', socket.id);

    socket.on('createRoom', ({ roomName, password }) => {
        const roomId = "cs-" + Math.random().toString(36).substring(2, 10);
        rooms.set(roomId, {
            name: roomName || "Yeni Oda",
            password: password || null,
            current: null,
            history: [],
            members: new Set()
        });
        joinRoomLogic(socket, roomId, password);
        socket.emit('roomCreated', { roomId });
    });

    socket.on('joinRoom', ({ roomId, password }) => {
        joinRoomLogic(socket, roomId, password);
    });

    function joinRoomLogic(socket, roomId, password) {
        const room = rooms.get(roomId);
        if (!room) return socket.emit('error', 'Oda bulunamadı');

        if (room.password && room.password !== password) {
            return socket.emit('error', 'Yanlış şifre!');
        }

        socket.join(roomId);
        room.members.add(socket.id);

        socket.emit('roomJoined', {
            roomId,
            roomName: room.name,
            current: room.current,
            history: room.history.slice(0, 50)
        });
    }

    socket.on('updateRoomSettings', ({ roomId, newName, newPassword }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        if (newName) room.name = newName;
        if (newPassword !== undefined) room.password = newPassword;
        io.to(roomId).emit('roomSettingsUpdated', { name: room.name });
    });

    socket.on('share', ({ roomId, type, value }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const payload = { type, value, timestamp: Date.now() };
        room.current = payload;
        room.history.unshift(payload);
        if (room.history.length > 60) room.history.pop();

        io.to(roomId).emit('newContent', payload);
        io.to(roomId).emit('historyUpdate', room.history);
    });

    socket.on('disconnect', () => {
        // Temizlik (opsiyonel)
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 ClipShare Pro http://localhost:${PORT}`));
