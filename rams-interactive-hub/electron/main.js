const { app, BrowserWindow, globalShortcut, protocol, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const dgram = require('dgram');
const http = require('http');
const os = require('os');
const WebSocket = require('ws');

// Register custom schemes
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
]);

let mainWindow;

// Setup file logging
const logFile = path.join(app.getPath('userData'), 'rams-app.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try { logStream.write(logMessage); } catch (e) {}
}

log('=== RAMS Interactive Hub Starting ===');
log(`Platform: ${process.platform} | Arch: ${process.arch} | Electron: ${process.versions.electron} | Node: ${process.versions.node}`);
log(`Packaged: ${app.isPackaged} | AppPath: ${app.getAppPath()}`);
log(`UserData: ${app.getPath('userData')}`);
log(`LogFile: ${logFile}`);

// Catch errors
process.on('uncaughtException', (error) => {
  log(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}`);
  dialog.showErrorBox('Error', `${error.message}\n\nLog: ${logFile}`);
});

process.on('unhandledRejection', (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});

// ===================== HTTP HARDWARE CLIENT =====================
const ESP32_PORT = 80;
const COMMAND_DEBOUNCE_MS = 150;
const HEALTH_CHECK_INTERVAL = 10000;
const BLOCK_DURATION_MS = 10000;  // 10 секунд для UP/DOWN

const hardwareConfigPath = path.join(app.getPath('userData'), 'hardware-config.json');

let espIP = '192.168.4.1';  // IP адрес ESP32 Access Point
let blockMapping = {}; // { galleryCardId: physicalBlockNumber } — custom overrides

// ===================== LG TV SSAP CLIENT =====================
const MEDIA_SERVER_PORT = 8888;
const SSAP_PORT = 3001;        // webOS 6+ uses wss:// on port 3001 (not ws:// on 3000)

let tvIP = '';
let tvClientKey = '';
let tvWs = null;
let tvConnected = false;
let mediaServer = null;
let ssapRequestId = 1;
let currentBlock = null;
let activeBlocks = new Set(); // Track active blocks (max 2)
let lastCommandTime = 0;
let debounceTimer = null;
let healthCheckTimer = null;
let espConnected = false;
let lastPong = 0;

// Load saved hardware config
function loadHardwareConfig() {
  try {
    if (fs.existsSync(hardwareConfigPath)) {
      const config = JSON.parse(fs.readFileSync(hardwareConfigPath, 'utf8'));
      if (config.espIP) espIP = config.espIP;
      if (config.blockMapping) blockMapping = config.blockMapping;
      if (config.tvIP) tvIP = config.tvIP;
      if (config.tvClientKey) tvClientKey = config.tvClientKey;
      log(`[UDP] Loaded config: ESP=${espIP}, TV=${tvIP || 'not set'}, mapping keys=${Object.keys(blockMapping).length}`);
    }
  } catch (e) {
    log(`[UDP] Failed to load config: ${e.message}`);
  }
}

function saveHardwareConfig() {
  try {
    fs.writeFileSync(hardwareConfigPath, JSON.stringify({ espIP, blockMapping, tvIP, tvClientKey }, null, 2));
    log(`[Config] Saved: ESP=${espIP}, TV=${tvIP || 'not set'}`);
  } catch (e) {
    log(`[Config] Failed to save: ${e.message}`);
  }
}

// Initialize HTTP client
function initHttp() {
  loadHardwareConfig();
  log(`[HTTP] Initialized - ESP32 at http://${espIP}:${ESP32_PORT}`);
  startHealthCheck();
}

// Send HTTP request to ESP32
function sendHttpRequest(endpoint, params = {}) {
  return new Promise((resolve) => {
    const queryString = Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
    const url = `http://${espIP}:${ESP32_PORT}${endpoint}${queryString ? '?' + queryString : ''}`;

    const options = {
      method: 'POST',
      timeout: 5000,
    };

    log(`[HTTP] Request: ${url}`);

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          log(`[HTTP] Success: ${data}`);
          espConnected = true;
          lastPong = Date.now();
          lastCommandTime = Date.now();
          resolve(true);
        } else if (res.statusCode === 429) {
          log(`[HTTP] Error 429: Maximum 2 blocks active`);
          resolve(false);
        } else {
          log(`[HTTP] Error ${res.statusCode}: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      log(`[HTTP] Request error: ${err.message}`);
      espConnected = false;
      resolve(false);
    });

    req.on('timeout', () => {
      log(`[HTTP] Request timeout`);
      req.destroy();
      espConnected = false;
      resolve(false);
    });

    req.end();
  });
}

// Debounced block command - with HTTP API
let pendingResolve = null;

function sendDebouncedBlockCommand(block, action) {
  return new Promise((resolve) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      if (pendingResolve) {
        pendingResolve(false);
        pendingResolve = null;
      }
    }

    pendingResolve = resolve;

    const timeSinceLast = Date.now() - lastCommandTime;
    const delay = Math.max(0, COMMAND_DEBOUNCE_MS - timeSinceLast);

    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      pendingResolve = null;

      // Отправляем HTTP запрос с длительностью 10 секунд
      const success = await sendHttpRequest('/api/block', {
        num: block,
        action: action.toLowerCase(),
        duration: BLOCK_DURATION_MS
      });

      if (success) {
        if (action === 'UP') currentBlock = block;
        else if (action === 'DOWN' && currentBlock === block) currentBlock = null;
      }

      resolve(success);
    }, delay);
  });
}

// Health check — ping ESP32 периодически через HTTP
function startHealthCheck() {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  healthCheckTimer = setInterval(async () => {
    // Проверяем статус ESP32
    try {
      const url = `http://${espIP}:${ESP32_PORT}/api/status`;
      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          espConnected = true;
          lastPong = Date.now();
        }
      });
      req.on('error', () => { espConnected = false; });
      req.on('timeout', () => { req.destroy(); espConnected = false; });
      req.setTimeout(3000);
    } catch (e) {
      espConnected = false;
    }

    // Mark as disconnected if no response for 30s
    if (lastPong > 0 && Date.now() - lastPong > 30000) {
      espConnected = false;
    }
  }, HEALTH_CHECK_INTERVAL);
}

// Cleanup HTTP resources
function cleanupHttp() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  log('[HTTP] Cleanup complete');
}

// ===================== END UDP =====================

// ===================== LG TV SSAP FUNCTIONS =====================

// Get local IPv4 address (for media server URL)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Start HTTP media server to serve video files to TV
function startMediaServer() {
  if (mediaServer) return;

  const videoMime = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
  };

  mediaServer = http.createServer((req, res) => {
    const mediaRoot = getMediaRoot();
    const rawUrl = req.url || '/';

    // Special route: /player?video=... — HTML5 video player page for LG TV browser
    if (rawUrl.startsWith('/player')) {
      const queryIndex = rawUrl.indexOf('?');
      const query = queryIndex !== -1 ? rawUrl.slice(queryIndex + 1) : '';
      const params = new URLSearchParams(query);
      const videoRelPath = params.get('video') || '';
      const localIP = getLocalIP();
      const videoSrc = videoRelPath
        ? `http://${localIP}:${MEDIA_SERVER_PORT}/${videoRelPath.replace(/^\/+/, '')}`
        : '';

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RAMS Video</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
  video { position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; }
</style>
</head>
<body>
  <video id="v" autoplay playsinline>
    <source src="${videoSrc}" type="video/mp4">
  </video>
  <script>
    var v = document.getElementById('v');
    v.play().catch(function() {
      document.body.addEventListener('click', function() { v.play(); }, { once: true });
    });
  </script>
</body>
</html>`;

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(html);
      log(`[MediaServer] Served player page for: ${videoRelPath}`);
      return;
    }

    const urlPath = decodeURIComponent(rawUrl.split('?')[0]);
    const filePath = path.join(mediaRoot, urlPath);

    // Security: prevent directory traversal
    if (!path.normalize(filePath).startsWith(mediaRoot)) {
      log(`[MediaServer] Blocked traversal: ${filePath}`);
      res.writeHead(403);
      res.end();
      return;
    }

    if (!fs.existsSync(filePath)) {
      log(`[MediaServer] Not found: ${filePath}`);
      res.writeHead(404);
      res.end();
      return;
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = videoMime[ext] || 'application/octet-stream';

    // Range request support (required for video seeking on TV)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(filePath).pipe(res);
    }

    log(`[MediaServer] ${req.method} ${urlPath} → ${res.statusCode}`);
  });

  mediaServer.listen(MEDIA_SERVER_PORT, '0.0.0.0', () => {
    log(`[MediaServer] Started on http://0.0.0.0:${MEDIA_SERVER_PORT}`);
  });

  mediaServer.on('error', (err) => {
    log(`[MediaServer] Error: ${err.message}`);
  });
}

// Connect to LG TV via SSAP WebSocket
function connectToTV() {
  if (tvWs) {
    try { tvWs.close(); } catch (e) {}
    tvWs = null;
    tvConnected = false;
  }

  if (!tvIP) {
    log('[TV] No TV IP configured');
    return false;
  }

  try {
    log(`[TV] Connecting to wss://${tvIP}:${SSAP_PORT}...`);
    // LG webOS 6+ uses wss:// with self-signed cert — must disable cert check
    tvWs = new WebSocket(`wss://${tvIP}:${SSAP_PORT}`, {
      rejectUnauthorized: false,
    });

    tvWs.on('open', () => {
      log(`[TV] WebSocket connected to ${tvIP}:${SSAP_PORT}`);
      // Send SSAP registration
      const registerMsg = {
        type: 'register',
        id: `reg_${ssapRequestId++}`,
        payload: {
          pairingType: 'PROMPT',
          'manifest': {
            permissions: [
              'LAUNCH', 'LAUNCH_WEBAPP', 'CONTROL_AUDIO',
              'CONTROL_INPUT_MEDIA_PLAYBACK', 'READ_INSTALLED_APPS',
              'CONTROL_POWER', 'READ_TV_CURRENT_TIME',
              'CONTROL_DISPLAY', 'CONTROL_INPUT_TV',
            ],
          },
          ...(tvClientKey ? { 'client-key': tvClientKey } : {}),
        },
      };
      tvWs.send(JSON.stringify(registerMsg));
      log('[TV] Registration request sent' + (tvClientKey ? ' (with saved key)' : ' (first time — check TV for prompt)'));
    });

    tvWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        log(`[TV] SSAP response: type=${msg.type}, id=${msg.id}`);

        if (msg.type === 'registered') {
          tvConnected = true;
          if (msg.payload && msg.payload['client-key']) {
            tvClientKey = msg.payload['client-key'];
            saveHardwareConfig();
            log(`[TV] Paired! Client key saved.`);
          }
          // Notify renderer
          if (mainWindow) {
            mainWindow.webContents.send('tv-status-changed', { connected: true, ip: tvIP });
          }
        }

        if (msg.type === 'error') {
          log(`[TV] SSAP Error: ${msg.error}`);
        }
      } catch (e) {
        log(`[TV] Parse error: ${e.message}`);
      }
    });

    tvWs.on('close', () => {
      log('[TV] WebSocket disconnected');
      tvConnected = false;
      tvWs = null;
      if (mainWindow) {
        mainWindow.webContents.send('tv-status-changed', { connected: false, ip: tvIP });
      }
    });

    tvWs.on('error', (err) => {
      log(`[TV] WebSocket error: ${err.message}`);
      tvConnected = false;
    });

    return true;
  } catch (e) {
    log(`[TV] Connection failed: ${e.message}`);
    return false;
  }
}

// Send SSAP request to TV
function sendSSAP(uri, payload = {}) {
  return new Promise((resolve) => {
    if (!tvWs || tvWs.readyState !== WebSocket.OPEN) {
      log(`[TV] Cannot send — not connected`);
      resolve(false);
      return;
    }

    const msg = {
      type: 'request',
      id: `req_${ssapRequestId++}`,
      uri,
      payload,
    };

    try {
      tvWs.send(JSON.stringify(msg));
      log(`[TV] SSAP → ${uri}`);
      resolve(true);
    } catch (e) {
      log(`[TV] Send error: ${e.message}`);
      resolve(false);
    }
  });
}

// Play video on LG TV
// Strategy:
//   1. Try ssap://media.viewer/open (works on webOS 4-5)
//   2. Fallback: open LG TV browser with our HTML5 player page (works on all webOS versions)
async function playVideoOnTV(videoRelPath) {
  // Ensure media server is running
  startMediaServer();

  const localIP = getLocalIP();

  // Strip leading slashes to avoid double-slash in URL
  const cleanPath = videoRelPath.replace(/^\/+/, '');
  const videoUrl = `http://${localIP}:${MEDIA_SERVER_PORT}/${cleanPath}`;
  // HTML5 player page URL (served by our media server at /player?video=...)
  const playerUrl = `http://${localIP}:${MEDIA_SERVER_PORT}/player?video=${encodeURIComponent(cleanPath)}`;

  log(`[TV] Playing on TV:`);
  log(`[TV]   videoUrl   = ${videoUrl}`);
  log(`[TV]   playerUrl  = ${playerUrl}`);

  if (!tvWs || tvWs.readyState !== WebSocket.OPEN) {
    log('[TV] Not connected — cannot play video');
    return false;
  }

  // Method 1: ssap://media.viewer/open (webOS 4-5)
  // Try it first, then also open browser as fallback (webOS 6+)
  const mediaViewerSent = await sendSSAP('ssap://media.viewer/open', {
    url: videoUrl,
    title: 'RAMS Global',
    description: '',
    mimeType: 'video/mp4',
    loop: false,
  });

  log(`[TV] media.viewer/open sent: ${mediaViewerSent}`);

  // Method 2 (always): Open browser with our HTML5 player page
  // This works on ALL webOS versions regardless of media.viewer support
  const browserSent = await sendSSAP('ssap://system.launcher/open', {
    id: 'com.webos.app.browser',
    params: { target: playerUrl },
  });

  log(`[TV] browser launcher sent: ${browserSent}`);

  return mediaViewerSent || browserSent;
}

// Stop video on TV
async function stopVideoOnTV() {
  // Close media viewer (webOS 4-5)
  await sendSSAP('ssap://media.viewer/close');
  // Close browser app (webOS 6+)
  await sendSSAP('ssap://system.launcher/close', { id: 'com.webos.app.browser' });
  log('[TV] Stop video sent');
  return true;
}

// Cleanup TV resources
function cleanupTV() {
  if (tvWs) {
    try { tvWs.close(); } catch (e) {}
    tvWs = null;
  }
  if (mediaServer) {
    try { mediaServer.close(); } catch (e) {}
    mediaServer = null;
  }
  tvConnected = false;
  log('[TV] Cleanup complete');
}

// ===================== END LG TV =====================

// Get media root path - searches multiple locations
function getMediaRoot() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return path.join(__dirname, '..', 'public');
  }

  // Production: search for media/projects folder in multiple locations
  const exeDir = path.dirname(app.getPath('exe'));

  // On macOS the exe is inside .app bundle, so go up
  const appDir = process.platform === 'darwin'
    ? path.join(exeDir, '..', '..')  // RAMS.app/Contents/MacOS -> RAMS.app/../
    : exeDir;

  const candidates = [
    { label: 'resources/media', path: path.join(process.resourcesPath, 'media') },
    { label: '[exe]/media', path: path.join(exeDir, 'media') },
    { label: '[app]/media', path: path.join(appDir, 'media') },
    { label: '[exe]/../media', path: path.join(exeDir, '..', 'media') },
  ];

  log(`[MediaSearch] ExeDir: ${exeDir}`);
  log(`[MediaSearch] AppDir: ${appDir}`);
  log(`[MediaSearch] ResourcesPath: ${process.resourcesPath}`);

  for (const candidate of candidates) {
    const projectsDir = path.join(candidate.path, 'projects');
    const exists = fs.existsSync(projectsDir);
    log(`[MediaSearch] ${candidate.label}: ${candidate.path} → projects/ ${exists ? 'FOUND' : 'not found'}`);
    if (exists) {
      try {
        const contents = fs.readdirSync(projectsDir);
        log(`[MediaSearch] Projects found: ${contents.join(', ')}`);
      } catch (e) {}
      log(`[MediaSearch] ✓ Using: ${candidate.path}`);
      return candidate.path;
    }
  }

  // Fallback to extraResources location
  const fallback = path.join(process.resourcesPath, 'media');
  log(`[MediaSearch] ✗ No media found! Fallback: ${fallback}`);
  return fallback;
}

function createWindow() {
  log('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    // KIOSK MODE
    kiosk: true,
    frame: false,
    fullscreen: true,
    autoHideMenuBar: true,
    alwaysOnTop: false,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load app
  const isDev = !app.isPackaged;
  if (isDev) {
    log('DEV: Loading http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
  } else {
    log('PROD: Loading app://./index.html');
    mainWindow.loadURL('app://./index.html');
  }

  mainWindow.webContents.on('did-finish-load', () => {
    log('[Window] Page loaded successfully');
    log(`[Window] URL: ${mainWindow.webContents.getURL()}`);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['LOG', 'WARN', 'ERROR'];
    log(`[Renderer ${levels[level] || level}] ${message}`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    log(`[Window] Page load FAILED: ${errorCode} - ${errorDescription} (URL: ${validatedURL})`);
    // Retry after 2 seconds in case dev server isn't ready
    if (isDev) {
      setTimeout(() => mainWindow.loadURL('http://localhost:3000'), 2000);
    }
  });

  // Keyboard shortcuts
  // Ctrl/Cmd+Q - quit app
  globalShortcut.register('CommandOrControl+Q', () => app.quit());
  // Ctrl/Cmd+Shift+A - open admin panel
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    mainWindow.webContents.send('open-admin');
  });
  // F5 - reload
  globalShortcut.register('F5', () => mainWindow.reload());

  // Disable right-click in kiosk mode
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.on('context-menu', (e) => e.preventDefault());

  // Prevent new windows (external links etc.)
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.on('closed', () => { mainWindow = null; });
}

// App ready
app.whenReady().then(() => {
  log('App ready');

  // Initialize HTTP client for hardware communication
  initHttp();

  // Start media server and auto-connect to TV if configured
  startMediaServer();
  if (tvIP) {
    setTimeout(() => connectToTV(), 2000);
  }

  // Register app:// protocol to serve static files (solves absolute path issue)
  const outDir = path.join(__dirname, '..', 'out');
  const mime = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.map': 'application/json',
    '.txt': 'text/plain',
  };

  protocol.handle('app', (request) => {
    let url = request.url.replace('app://.', '');
    // Remove query string
    url = url.split('?')[0];
    // Decode
    url = decodeURIComponent(url);
    // Default to index.html
    if (url === '/' || url === '') url = '/index.html';
    // Remove leading slash
    if (url.startsWith('/')) url = url.slice(1);

    const filePath = path.join(outDir, url);

    // Security: prevent directory traversal
    if (!path.normalize(filePath).startsWith(outDir)) {
      log(`Security: blocked traversal: ${filePath}`);
      return new Response('Forbidden', { status: 403 });
    }

    // Try exact file, then with .html, then index.html in dir
    let resolvedPath = filePath;
    if (!fs.existsSync(resolvedPath)) {
      if (fs.existsSync(resolvedPath + '.html')) {
        resolvedPath = resolvedPath + '.html';
      } else if (fs.existsSync(path.join(resolvedPath, 'index.html'))) {
        resolvedPath = path.join(resolvedPath, 'index.html');
      } else {
        log(`App file not found: ${resolvedPath}`);
        return new Response('Not Found', { status: 404 });
      }
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeType = mime[ext] || 'application/octet-stream';

    try {
      const data = fs.readFileSync(resolvedPath);
      return new Response(data, {
        headers: { 'Content-Type': mimeType }
      });
    } catch (e) {
      log(`Error reading file: ${resolvedPath} - ${e.message}`);
      return new Response('Error', { status: 500 });
    }
  });

  const outExists = fs.existsSync(outDir);
  const outIndexExists = fs.existsSync(path.join(outDir, 'index.html'));
  log(`[AppProtocol] Serving from: ${outDir}`);
  log(`[AppProtocol] out/ exists: ${outExists} | index.html exists: ${outIndexExists}`);
  if (outExists) {
    try {
      const outContents = fs.readdirSync(outDir).slice(0, 20);
      log(`[AppProtocol] out/ contents: ${outContents.join(', ')}`);
    } catch (e) {}
  }

  // Register custom protocol for media files
  protocol.registerFileProtocol('media', (request, callback) => {
    // Strip protocol (media:// or media:///)
    const url = decodeURIComponent(request.url.replace(/^media:\/\/\/?/, ''));
    const mediaRoot = getMediaRoot();
    const resourcePath = path.normalize(path.join(mediaRoot, url));

    // Security: prevent directory traversal
    if (!resourcePath.startsWith(mediaRoot)) {
      log(`Security: blocked path traversal attempt: ${resourcePath}`);
      callback({ error: -3 });
      return;
    }

    if (!fs.existsSync(resourcePath)) {
      log(`Media not found: ${resourcePath}`);
      callback({ error: -6 });
      return;
    }

    callback({ path: resourcePath });
  });

  // IPC handlers — existing
  ipcMain.handle('get-media-root', () => getMediaRoot());

  ipcMain.handle('get-projects-data', () => {
    const mediaRoot = getMediaRoot();
    const jsonPath = path.join(mediaRoot, 'projects.json');
    if (fs.existsSync(jsonPath)) {
      try {
        return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } catch (e) {
        log(`Error reading projects.json: ${e.message}`);
        return null;
      }
    }
    return null;
  });

  // Media stats IPC (replaces API route)
  ipcMain.handle('get-media-stats', () => {
    const mediaRoot = getMediaRoot();
    const projectsPath = path.join(mediaRoot, 'projects');
    if (!fs.existsSync(projectsPath)) return [];

    try {
      const folders = fs.readdirSync(projectsPath).filter(f =>
        fs.statSync(path.join(projectsPath, f)).isDirectory()
      );

      return folders.map(projectId => {
        const projectPath = path.join(projectsPath, projectId);
        const stats = { projectId, videos: 0, photos: 0, hasLogo: false, hasMainImage: false };

        const imagesPath = path.join(projectPath, 'images');
        if (fs.existsSync(imagesPath)) {
          stats.hasMainImage = fs.existsSync(path.join(imagesPath, 'main.jpg'));
          const logoPath = path.join(imagesPath, 'logo');
          if (fs.existsSync(logoPath)) {
            stats.hasLogo = fs.readdirSync(logoPath).some(f => f.startsWith('logo.'));
          }
          const scenesPath = path.join(imagesPath, 'scenes');
          if (fs.existsSync(scenesPath)) {
            stats.photos = fs.readdirSync(scenesPath).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).length;
          }
        }

        const videosPath = path.join(projectPath, 'videos');
        if (fs.existsSync(videosPath)) {
          stats.videos = fs.readdirSync(videosPath).filter(f => /\.(mp4|webm|mov)$/i.test(f)).length;
        }

        return stats;
      });
    } catch (e) {
      log(`Error scanning media: ${e.message}`);
      return [];
    }
  });

  // Diagnostic IPC - shows where media is being searched
  ipcMain.handle('get-diagnostics', () => {
    const exeDir = path.dirname(app.getPath('exe'));
    const mediaRoot = getMediaRoot();

    const candidates = [
      { label: 'resources/media', path: path.join(process.resourcesPath, 'media') },
      { label: '[exe]/media', path: path.join(exeDir, 'media') },
      { label: '[exe]/../media', path: path.join(exeDir, '..', 'media') },
      { label: 'resources (direct)', path: process.resourcesPath },
      { label: '[exe] (direct)', path: exeDir },
    ];

    const results = candidates.map(c => {
      const projectsDir = path.join(c.path, 'projects');
      const exists = fs.existsSync(projectsDir);
      let sampleFiles = [];
      if (exists) {
        try {
          const dirs = fs.readdirSync(projectsDir).slice(0, 5);
          sampleFiles = dirs;
        } catch (e) {}
      }
      return { ...c, projectsExists: exists, sampleFiles };
    });

    return {
      platform: process.platform,
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      exePath: app.getPath('exe'),
      exeDir,
      resourcesPath: process.resourcesPath,
      mediaRoot,
      mediaRootExists: fs.existsSync(mediaRoot),
      candidates: results,
    };
  });

  // ===================== Hardware IPC Handlers =====================

  ipcMain.handle('hardware-block-up', async (_event, blockNumber) => {
    return sendDebouncedBlockCommand(blockNumber, 'UP');
  });

  ipcMain.handle('hardware-block-down', async (_event, blockNumber) => {
    return sendDebouncedBlockCommand(blockNumber, 'DOWN');
  });

  ipcMain.handle('hardware-all-stop', async () => {
    currentBlock = null;
    activeBlocks.clear();
    return sendHttpRequest('/api/stop');
  });

  ipcMain.handle('hardware-all-down', async () => {
    currentBlock = null;
    activeBlocks.clear();
    return sendHttpRequest('/api/all', { action: 'down' });
  });

  ipcMain.handle('hardware-led-mode', async (_event, mode) => {
    return sendHttpRequest('/api/led', { mode });
  });

  ipcMain.handle('hardware-led-color', async (_event, hexColor) => {
    return sendHttpRequest('/api/led', { color: hexColor });
  });

  ipcMain.handle('hardware-led-brightness', async (_event, brightness) => {
    return sendHttpRequest('/api/led', { brightness });
  });

  ipcMain.handle('hardware-get-status', () => {
    return {
      connected: espConnected,
      ip: espIP,
      lastPong,
      currentBlock,
    };
  });

  ipcMain.handle('hardware-set-ip', (_event, newIP) => {
    espIP = newIP;
    saveHardwareConfig();
    // Reset connection state and check immediately
    espConnected = false;
    lastPong = 0;
    sendHttpRequest('/api/status').catch(() => {});
    return { success: true, ip: espIP };
  });

  ipcMain.handle('hardware-ping', async () => {
    const sent = await sendHttpRequest('/api/status');
    return { sent, connected: espConnected, lastPong };
  });

  ipcMain.handle('hardware-send-command', async (_event, cmd) => {
    // Translate legacy UDP command strings to HTTP for backward compat
    if (cmd === 'PING') return sendHttpRequest('/api/status');
    if (cmd === 'ALL:STOP') return sendHttpRequest('/api/stop');
    if (cmd === 'ALL:DOWN') return sendHttpRequest('/api/all', { action: 'down' });
    if (cmd.startsWith('LED:MODE:')) return sendHttpRequest('/api/led', { mode: cmd.split(':')[2] });
    if (cmd.startsWith('LED:COLOR:')) return sendHttpRequest('/api/led', { color: cmd.split(':')[2] });
    if (cmd.startsWith('LED:BRIGHTNESS:')) return sendHttpRequest('/api/led', { brightness: cmd.split(':')[2] });
    if (cmd.startsWith('BLOCK:')) {
      const parts = cmd.split(':');
      return sendHttpRequest('/api/block', { num: parts[1], action: parts[2].toLowerCase(), duration: BLOCK_DURATION_MS });
    }
    log(`[HTTP] Unknown command: ${cmd}`);
    return false;
  });

  ipcMain.handle('hardware-get-block-mapping', () => {
    return blockMapping;
  });

  ipcMain.handle('hardware-set-block-mapping', (_event, newMapping) => {
    blockMapping = newMapping;
    saveHardwareConfig();
    log(`[UDP] Block mapping updated: ${JSON.stringify(blockMapping)}`);
    return { success: true };
  });

  // ===================== TV IPC Handlers =====================

  ipcMain.handle('tv-connect', async () => {
    return connectToTV();
  });

  ipcMain.handle('tv-disconnect', async () => {
    if (tvWs) {
      try { tvWs.close(); } catch (e) {}
      tvWs = null;
      tvConnected = false;
    }
    return true;
  });

  ipcMain.handle('tv-play-video', async (_event, videoRelPath) => {
    return playVideoOnTV(videoRelPath);
  });

  ipcMain.handle('tv-stop-video', async () => {
    return stopVideoOnTV();
  });

  ipcMain.handle('tv-get-status', () => {
    return { connected: tvConnected, ip: tvIP, hasKey: !!tvClientKey };
  });

  ipcMain.handle('tv-set-ip', (_event, ip) => {
    tvIP = ip;
    saveHardwareConfig();
    // Reset connection
    tvConnected = false;
    tvClientKey = '';
    if (tvWs) {
      try { tvWs.close(); } catch (e) {}
      tvWs = null;
    }
    return { success: true, ip: tvIP };
  });

  // ===================== End TV IPC =====================

  // Log all registered protocols
  log('[Protocols] app:// and media:// registered');

  createWindow();
  log('[Startup] Application started successfully!');
  log(`[Startup] Window size: ${mainWindow.getBounds().width}x${mainWindow.getBounds().height}`);
  log(`[Startup] Fullscreen: ${mainWindow.isFullScreen()} | Kiosk: ${mainWindow.isKiosk()}`);
  log(`[Startup] Memory: ${JSON.stringify(process.memoryUsage())}`);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', async () => {
  log('[HTTP] Sending STOP ALL before quit...');
  // Send STOP ALL via HTTP before quitting
  try {
    await sendHttpRequest('/api/stop');
  } catch (e) {
    log(`[HTTP] Failed to send STOP on quit: ${e.message}`);
  }
  cleanupHttp();
  cleanupTV();
  log('=== RAMS Interactive Hub Stopped ===');
  try { logStream.end(); } catch (e) {}
});
