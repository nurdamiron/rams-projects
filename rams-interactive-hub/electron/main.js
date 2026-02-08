const { app, BrowserWindow, globalShortcut, protocol, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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

  // IPC handlers
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

app.on('before-quit', () => {
  log('=== RAMS Interactive Hub Stopped ===');
  try { logStream.end(); } catch (e) {}
});
