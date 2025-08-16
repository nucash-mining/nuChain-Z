const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

let mainWindow;
let walletServer;

// Development flag
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    show: false
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('index.html');
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Start wallet backend server
function startWalletServer() {
  const serverPath = path.join(__dirname, '../main.go');
  
  if (process.platform === 'win32') {
    walletServer = spawn('go', ['run', serverPath], {
      cwd: path.dirname(serverPath),
      stdio: 'pipe'
    });
  } else {
    walletServer = spawn('go', ['run', serverPath], {
      cwd: path.dirname(serverPath),
      stdio: 'pipe'
    });
  }

  walletServer.stdout.on('data', (data) => {
    console.log(`Wallet Server: ${data}`);
  });

  walletServer.stderr.on('data', (data) => {
    console.error(`Wallet Server Error: ${data}`);
  });

  walletServer.on('close', (code) => {
    console.log(`Wallet server process exited with code ${code}`);
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  startWalletServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (walletServer) {
    walletServer.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (walletServer) {
    walletServer.kill();
  }
});

// Menu setup
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Wallet',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('menu-import-wallet');
          }
        },
        {
          label: 'Export Wallet',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-wallet');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Wallet',
      submenu: [
        {
          label: 'Send Transaction',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('menu-send-transaction');
          }
        },
        {
          label: 'Receive',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.send('menu-receive');
          }
        },
        {
          label: 'Transaction History',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            mainWindow.webContents.send('menu-transaction-history');
          }
        }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Mining Dashboard',
          click: () => {
            mainWindow.webContents.send('menu-mining-dashboard');
          }
        },
        {
          label: 'WATTxchange',
          click: () => {
            mainWindow.webContents.send('menu-wattxchange');
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu-settings');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Z Core Wallet',
          click: () => {
            mainWindow.webContents.send('menu-about');
          }
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/z-blockchain/docs');
          }
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
});

// IPC handlers
ipcMain.handle('get-wallet-info', async () => {
  // Communicate with wallet backend
  try {
    const response = await fetch('http://localhost:8080/api/wallet');
    return await response.json();
  } catch (error) {
    console.error('Failed to get wallet info:', error);
    return null;
  }
});

ipcMain.handle('get-transaction-history', async () => {
  try {
    const response = await fetch('http://localhost:8080/api/transactions');
    return await response.json();
  } catch (error) {
    console.error('Failed to get transaction history:', error);
    return [];
  }
});

ipcMain.handle('create-transaction', async (event, transactionData) => {
  try {
    const response = await fetch('http://localhost:8080/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to create transaction:', error);
    return null;
  }
});

// Auto updater (for production builds)
if (!isDev) {
  const { autoUpdater } = require('electron-updater');
  
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
  });
}