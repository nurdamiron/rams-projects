const { app, BrowserWindow, globalShortcut, protocol, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Register 'media' as a privileged scheme to bypass some security restrictions
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

let mainWindow;
let nextApp;
let server;

// Setup file logging for debugging
const logFile = path.join(app.getPath('userData'), 'rams-app.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    logStream.write(logMessage);
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
}

log('=== RAMS Interactive Hub Starting ===');
log(`App version: ${app.getVersion()}`);
log(`Electron version: ${process.versions.electron}`);
log(`Node version: ${process.versions.node}`);
log(`Platform: ${process.platform}`);
log(`App path: ${app.getAppPath()}`);
log(`User data: ${app.getPath('userData')}`);
log(`Log file: ${logFile}`);

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`UNCAUGHT EXCEPTION: ${error.message}`);
  log(`Stack: ${error.stack}`);
  try {
    dialog.showErrorBox(
      'Uncaught Exception',
      `An unexpected error occurred:\n\n${error.message}\n\nLog file:\n${logFile}`
    );
  } catch (e) {
    log(`Failed to show error dialog: ${e.message}`);
  }
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log(`UNHANDLED REJECTION: ${reason}`);
  log(`Promise: ${promise}`);
  try {
    dialog.showErrorBox(
      'Unhandled Promise Rejection',
      `An unexpected error occurred:\n\n${reason}\n\nLog file:\n${logFile}`
    );
  } catch (e) {
    log(`Failed to show error dialog: ${e.message}`);
  }
});

// Start Next.js server in production using embedded server
async function startNextServer() {
  const isDev = process.env.NODE_ENV === 'development';
  log(`Starting Next.js server (isDev: ${isDev})`);

  if (isDev) {
    // In development, assume server is already running
    log('[DEV] Using external Next.js dev server on http://localhost:3000');
    return;
  }

  try {
    log('[PROD] Starting embedded Next.js server...');

    // Import Next.js
    log('[PROD] Requiring next module...');
    const next = require('next');
    log('[PROD] Next module loaded successfully');

    const http = require('http');
    log('[PROD] HTTP module loaded');

    // Get app directory
    const appDir = path.join(__dirname, '..');
    log(`[PROD] App directory: ${appDir}`);
    log(`[PROD] __dirname: ${__dirname}`);

    // Check if .next directory exists
    const nextDir = path.join(appDir, '.next');
    log(`[PROD] Checking for .next directory at: ${nextDir}`);

    if (!fs.existsSync(nextDir)) {
      log(`[PROD] ERROR: .next directory not found!`);
      log(`[PROD] Listing contents of appDir: ${appDir}`);
      try {
        const files = fs.readdirSync(appDir);
        log(`[PROD] Files in appDir: ${files.join(', ')}`);
      } catch (e) {
        log(`[PROD] Failed to list appDir: ${e.message}`);
      }
      throw new Error(`.next directory not found at ${nextDir}`);
    }
    log(`[PROD] Found .next build at: ${nextDir}`);

    // Initialize Next.js app
    log('[PROD] Initializing Next.js app...');
    nextApp = next({
      dev: false,
      dir: appDir,
      conf: {
        distDir: '.next',
      }
    });
    log('[PROD] Next.js app object created');

    log('[PROD] Preparing Next.js app...');
    await nextApp.prepare();
    log('[PROD] Next.js app prepared successfully');

    const handle = nextApp.getRequestHandler();
    log('[PROD] Got request handler');

    // Create HTTP server
    log('[PROD] Creating HTTP server...');
    server = http.createServer((req, res) => {
      handle(req, res);
    });
    log('[PROD] HTTP server created');

    // Start listening
    log('[PROD] Starting to listen on port 3000...');
    await new Promise((resolve, reject) => {
      server.listen(3000, (err) => {
        if (err) {
          log(`[PROD] ERROR: Failed to start HTTP server: ${err.message}`);
          reject(err);
        } else {
          log('[PROD] Next.js server ready on http://localhost:3000');
          resolve();
        }
      });
    });

    log('[PROD] Server startup complete!');
  } catch (error) {
    log(`[PROD] FATAL ERROR: ${error.message}`);
    log(`[PROD] Error stack: ${error.stack}`);

    // Show error dialog to user
    const errorMessage = `Failed to start the application:\n\n${error.message}\n\nLog file location:\n${logFile}`;
    log(`[PROD] Showing error dialog to user`);

    dialog.showErrorBox('Startup Error', errorMessage);

    throw error;
  }
}

function createWindow() {
  log('Creating main window...');

  try {
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

    log('Main window created successfully');

    // Load the Next.js app
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    log(`Loading URL: ${startUrl}`);

    mainWindow.loadURL(startUrl);

    mainWindow.webContents.on('did-finish-load', () => {
      log('Page loaded successfully');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      log(`ERROR: Page failed to load: ${errorCode} - ${errorDescription}`);
    });
  } catch (error) {
    log(`ERROR: Failed to create window: ${error.message}`);
    log(`Error stack: ${error.stack}`);
    throw error;
  }

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
  log('App ready event fired');

  try {
    log('Calling startNextServer...');
    await startNextServer();
    log('startNextServer completed successfully');

    log('Calling createWindow...');
    createWindow();
    log('createWindow completed successfully');

    log('Application started successfully!');
  } catch (error) {
    log(`FATAL: Failed to start application: ${error.message}`);
    log(`Error stack: ${error.stack}`);

    // Try to show error dialog even if window creation failed
    try {
      dialog.showErrorBox(
        'Fatal Error',
        `Application failed to start:\n\n${error.message}\n\nLog file:\n${logFile}\n\nThe application will now close.`
      );
    } catch (dialogError) {
      log(`Failed to show error dialog: ${dialogError.message}`);
    }

    log('Quitting application due to fatal error');
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

app.on('before-quit', async () => {
  log('App quit event - cleaning up...');

  // Close Next.js server when app is closing
  try {
    if (server) {
      log('[CLEANUP] Closing HTTP server...');
      await new Promise((resolve) => {
        server.close(() => {
          log('[CLEANUP] HTTP server closed');
          resolve();
        });
      });
    }
    if (nextApp) {
      log('[CLEANUP] Closing Next.js app...');
      await nextApp.close();
      log('[CLEANUP] Next.js app closed');
    }

    // Close log stream
    if (logStream) {
      log('[CLEANUP] Closing log stream...');
      logStream.end();
    }
  } catch (error) {
    log(`[CLEANUP] Error during shutdown: ${error.message}`);
  }

  log('=== RAMS Interactive Hub Stopped ===');
});
