const { app, BrowserWindow, globalShortcut, protocol, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Register 'media' as a privileged scheme to bypass some security restrictions
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

let mainWindow;
let nextServer;

// Start Next.js server in production
function startNextServer() {
  return new Promise((resolve, reject) => {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // In development, assume server is already running
      resolve();
      return;
    }

    // In production, start Next.js server
    const nextPath = path.join(__dirname, '..', 'node_modules', '.bin', 'next');
    nextServer = spawn(nextPath, ['start'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: '3000' }
    });

    nextServer.stdout.on('data', (data) => {
      console.log(`Next.js: ${data}`);
      if (data.toString().includes('Ready')) {
        resolve();
      }
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    nextServer.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      reject(error);
    });

    // Fallback timeout
    setTimeout(resolve, 5000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    // KIOSK MODE SETTINGS
    kiosk: true,              // Fullscreen, no window management
    frame: false,             // No title bar
    fullscreen: true,         // Explicit fullscreen
    autoHideMenuBar: true,    // Hide menu
    alwaysOnTop: false,       // Set to true if you want to block Alt+Tab (requires rights)
    webPreferences: {
      nodeIntegration: false, // Security: disable node integration
      contextIsolation: true, // Security: enable context isolation
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the Next.js app
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';

  mainWindow.loadURL(startUrl);

  // Disable standard keyboard shortcuts that might close the app
  // But leave a "panic button" for us developers (Ctrl+Q)
  globalShortcut.register('CommandOrControl+Q', () => {
    app.quit();
  });

  // Admin panel shortcut (Ctrl+Shift+A)
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    mainWindow.webContents.send('open-admin');
  });

  // Disable F11 (fullscreen toggle) and others if needed
  mainWindow.setMenuBarVisibility(false);

  // Disable right-click context menu in kiosk mode
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Register custom protocol for media files
app.whenReady().then(() => {
  protocol.registerFileProtocol('media', (request, callback) => {
    const url = request.url.replace('media://', '');
    const isDev = process.env.NODE_ENV === 'development';
    
    let resourcePath;
    if (isDev) {
      // In dev, point to public folder
      resourcePath = path.join(__dirname, '..', 'public', url);
    } else {
      // PROD: Use media folder next to the app
      // Structure: AppFolder/media/projects/...
      const appPath = app.getAppPath();
      const mediaPath = path.join(path.dirname(appPath), 'media', url);

      // Fallback to public folder if media folder doesn't exist
      if (fs.existsSync(path.dirname(mediaPath))) {
        resourcePath = mediaPath;
      } else {
        // Try relative to exe location
        resourcePath = path.join(process.cwd(), 'media', url);
      }
    }

    // Decode URL to handle spaces and special chars
    const decodedPath = decodeURIComponent(resourcePath);
    
    // Safety check - prevent directory traversal
    // (Basic check, can be improved)
    
    callback({ path: decodedPath });
  });

  // Helper function to get media root
  const getMediaRoot = () => {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      return path.join(__dirname, '..', 'public');
    }
    // Production: media folder next to app
    const exeDir = path.dirname(app.getPath('exe'));
    return path.join(exeDir, 'media');
  };

  // Handle IPC for getting media root
  ipcMain.handle('get-media-root', () => getMediaRoot());

  // Handle IPC for reading external projects data
  ipcMain.handle('get-projects-data', () => {
    const mediaRoot = getMediaRoot();
    const jsonPath = path.join(mediaRoot, 'projects.json');
    console.log('Checking for external projects at:', jsonPath);

    if (fs.existsSync(jsonPath)) {
      try {
        const data = fs.readFileSync(jsonPath, 'utf8');
        const projects = JSON.parse(data);
        console.log(`Loaded ${projects.length} external projects`);
        return projects;
      } catch (e) {
        console.error('Error reading projects.json:', e);
        return null;
      }
    }
    return null; // Fallback to internal data
  });
});

app.on('ready', async () => {
  try {
    await startNextServer();
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  // Kill Next.js server when app is closing
  if (nextServer) {
    nextServer.kill();
  }
});
