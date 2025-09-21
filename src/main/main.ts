import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import * as path from 'path';
import ApiClient from './api-client';
const Store = require('electron-store');

// __dirname is already available in CommonJS
const isDev = !app.isPackaged;

const store = new Store() as any;
const apiClient = new ApiClient();

let mainWindow: BrowserWindow | null = null;
let setupWindow: BrowserWindow | null = null;

function createWindow() {
  const windowState = store.get('mainWindow', {
    x: 100,
    y: 100,
    width: 482,
    height: 436
  }) as any;

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 482,    // 最小幅: 482px
    minHeight: 436,   // 最小高さ: 436px
    title: '電帳君',
    icon: path.join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  mainWindow.on('close', () => {
    const bounds = mainWindow!.getBounds();
    store.set('mainWindow', bounds);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // 自動で開発者ツールを開かない
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 600,
    height: 500,
    title: 'セットアップ - 電帳君',
    parent: mainWindow || undefined,
    modal: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  if (isDev) {
    setupWindow.loadURL('http://localhost:5173/#/setup');
  } else {
    setupWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/setup'
    });
  }

  setupWindow.on('closed', () => {
    setupWindow = null;
  });
}

function createMenu() {
  const template: any = [
    {
      label: 'ファイル',
      submenu: [
        {
          label: '新規取引',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-new-transaction');
          }
        },
        {
          label: 'インポート',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow?.webContents.send('menu-import');
          }
        },
        {
          label: 'エクスポート',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('menu-export');
          }
        },
        { type: 'separator' },
        {
          label: '設定',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            createSetupWindow();
          }
        },
        { type: 'separator' },
        {
          label: '終了',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          role: 'quit'
        }
      ]
    },
    {
      label: '編集',
      submenu: [
        { label: '元に戻す', role: 'undo' },
        { label: 'やり直し', role: 'redo' },
        { type: 'separator' },
        { label: '切り取り', role: 'cut' },
        { label: 'コピー', role: 'copy' },
        { label: '貼り付け', role: 'paste' }
      ]
    },
    {
      label: '表示',
      submenu: [
        { label: 'リロード', role: 'reload' },
        { label: '開発者ツール', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'ズームイン', role: 'zoomIn' },
        { label: 'ズームアウト', role: 'zoomOut' },
        { label: 'ズームリセット', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'フルスクリーン', role: 'togglefullscreen' }
      ]
    },
    {
      label: '期間',
      submenu: [
        {
          label: '新規期間作成',
          click: () => {
            mainWindow?.webContents.send('menu-new-period');
          }
        },
        {
          label: '期間管理',
          click: () => {
            mainWindow?.webContents.send('menu-manage-periods');
          }
        }
      ]
    },
    {
      label: 'マスター',
      submenu: [
        {
          label: '取引先マスター',
          click: () => {
            mainWindow?.webContents.send('menu-partners-master');
          }
        },
        {
          label: '書類種別マスター',
          click: () => {
            mainWindow?.webContents.send('menu-doctype-master');
          }
        }
      ]
    },
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'ドキュメント',
          click: () => {
            shell.openExternal('https://www.roundshape.jp/denchokun/docs');
          }
        },
        {
          label: 'サポート',
          click: () => {
            shell.openExternal('https://www.roundshape.jp/support');
          }
        },
        { type: 'separator' },
        {
          label: '電帳君について',
          click: () => {
            mainWindow?.webContents.send('menu-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-file', async (event, options = {}) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options.filters || [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-files', async (event, options = {}) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: options.filters || [
      { name: 'Images', extensions: ['jpg', 'png', 'gif', 'pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(options);
  return result;
});

ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('get-store-value', (event, key, defaultValue) => {
  return store.get(key, defaultValue);
});

ipcMain.handle('set-store-value', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('delete-store-value', (event, key) => {
  store.delete(key);
  return true;
});

// App Events
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Save any pending data
});

// File system IPC handlers
ipcMain.handle('fs-read-file', async (event, filePath: string) => {
  const fs = await import('fs/promises');
  return fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('fs-write-file', async (event, filePath: string, data: string) => {
  const fs = await import('fs/promises');
  return fs.writeFile(filePath, data, 'utf-8');
});

ipcMain.handle('fs-exists', async (event, filePath: string) => {
  const fs = await import('fs/promises');
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs-mkdir', async (event, dirPath: string) => {
  const fs = await import('fs/promises');
  return fs.mkdir(dirPath, { recursive: true });
});

ipcMain.handle('fs-readdir', async (event, dirPath: string) => {
  const fs = await import('fs/promises');
  return fs.readdir(dirPath);
});

ipcMain.handle('fs-stat', async (event, filePath: string) => {
  const fs = await import('fs/promises');
  return fs.stat(filePath);
});

ipcMain.handle('fs-copy-file', async (event, src: string, dest: string) => {
  const fs = await import('fs/promises');
  return fs.copyFile(src, dest);
});

ipcMain.handle('fs-unlink', async (event, filePath: string) => {
  const fs = await import('fs/promises');
  return fs.unlink(filePath);
});

// Initialize app settings if first run
if (!store.has('initialized')) {
  store.set('settings', {
    baseFolder: app.getPath('documents'),
    workingPeriod: '',
    mbsLicense: {
      name: '',
      product: '',
      yearMonth: '',
      serialKey: ''
    }
  });
  store.set('initialized', true);
}