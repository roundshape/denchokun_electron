import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';
import ApiClient from './api-client';
import { getFileThumbnailBase64, getFileThumbnailFromMemory } from './winshell-preview';
const Store = require('electron-store');

// __dirname is already available in CommonJS
const isDev = !app.isPackaged;

const store = new Store() as any;
const apiClient = new ApiClient();

let mainWindow: BrowserWindow | null = null;
let setupWindow: BrowserWindow | null = null;

function createWindow() {
  // ウィンドウサイズを強制的にリセット
  store.delete('mainWindow');
  
  const windowState = store.get('mainWindow', {
    x: 100,
    y: 100,
    width: 800,
    height: 800
  }) as any;

  mainWindow = new BrowserWindow({
    x: 100,
    y: 100,
    width: 750,       // 初期幅: 750px
    height: 600,      // 初期高さ: 600px
    minWidth: 750,    // 最小幅: 750px
    minHeight: 600,   // 最小高さ: 600px
    maxHeight: 600,   // 最大高さ: 600px（縦方向固定）
    resizable: true,  // リサイズ有効
    show: false,      // 初期は非表示
    title: '電帳君',
    icon: path.join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
      zoomFactor: 1.0,
      webSecurity: true,  // セキュリティを有効化
      allowRunningInsecureContent: false
    }
  });

  // mainWindow.on('close', () => {
  //   const bounds = mainWindow!.getBounds();
  //   store.set('mainWindow', bounds);
  // });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // 開発者ツールは手動で開く（F12キー）
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // コンテンツが読み込まれた後にウィンドウを表示
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      // 強制的に750x600に設定して表示
      mainWindow.setBounds({
        x: 100,
        y: 100,
        width: 750,
        height: 600
      });
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // ネイティブファイルドロップ処理
  if (mainWindow) {
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const url = new URL(navigationUrl);
      if (url.protocol === 'file:') {
        event.preventDefault();
        const filePath = decodeURIComponent(url.pathname);
        console.log('File dropped via native:', filePath);
        
        // フロントエンドにファイルパスを送信
        if (mainWindow) {
          mainWindow.webContents.send('file-dropped-native', filePath);
        }
      }
    });
  }
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
        {
          label: '環境設定',
          click: () => {
            mainWindow?.webContents.send('menu-environment');
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
        { 
          label: '開発者ツール', 
          role: 'toggleDevTools',
          accelerator: 'F12'
        },
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
  // DPIスケーリングを無効にして物理ピクセルで制御
  app.commandLine.appendSwitch('high-dpi-support', 'true');
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
  
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

// WinShellPreview DLL integration
ipcMain.handle('get-file-preview', async (event, filePath: string, outputPath?: string) => {
  return new Promise((resolve, reject) => {
    try {
      // TestApp.exeのパスを取得
      const resourcesPath = isDev 
        ? path.join(__dirname, '../../resources')
        : path.join(process.resourcesPath, 'resources');
      
      const testAppPath = path.join(resourcesPath, 'TestApp.exe');
      
      // 出力パスが指定されていない場合、一時ファイルを生成
      const finalOutputPath = outputPath || path.join(app.getPath('temp'), `preview_${Date.now()}.png`);
      
      console.log('TestApp path:', testAppPath);
      console.log('Input file:', filePath);
      console.log('Output file:', finalOutputPath);
      
      // TestApp.exe を実行してプレビューを生成
      const child = spawn(testAppPath, [filePath, finalOutputPath, '256'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath: finalOutputPath,
            message: stdout
          });
        } else {
          reject({
            success: false,
            error: stderr || `Process exited with code ${code}`,
            code
          });
        }
      });
      
      child.on('error', (error) => {
        reject({
          success: false,
          error: error.message
        });
      });
      
    } catch (error) {
      reject({
        success: false,
        error: (error as Error).message
      });
    }
  });
});

// WinShellPreview.dll を直接使用

// メモリデータから直接サムネイルを生成（アイコンフォールバック付き）
ipcMain.handle('get-preview-from-memory', async (event, fileData: number[], fileName: string) => {
  try {
    console.log('Generating thumbnail from memory data for:', fileName, 'size:', fileData.length);
    
    // number[]をUint8Arrayに変換
    const uint8Array = new Uint8Array(fileData);
    
    // koffiを使用してWinShellPreview.dllを直接呼び出し
    const result = await getFileThumbnailFromMemory(uint8Array, fileName, 256);
    
    if (result.success) {
      return {
        success: true,
        base64: result.base64,
        originalPath: fileName
      };
    } else {
      console.warn('Memory preview failed, no fallback available:', result.error);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('Error in get-preview-from-memory:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
});

// サムネイルファイルをBase64として取得（アイコンフォールバック付き）
ipcMain.handle('get-preview-base64', async (event, filePath: string) => {
  try {
    console.log('Generating thumbnail using updated DLL for:', filePath);
    
    // koffiを使用してWinShellPreview.dllを直接呼び出し
    const result = await getFileThumbnailBase64(filePath, 256);
    
    if (result.success) {
      return {
        success: true,
        base64: result.base64,
        originalPath: filePath
      };
    } else {
      // フォールバック: TestApp.exe を使用
      console.warn('koffi failed, falling back to TestApp.exe:', result.error);
      return await fallbackToTestApp(filePath);
    }
  } catch (error) {
    console.error('Error in get-preview-base64:', error);
    // フォールバック: TestApp.exe を使用
    return await fallbackToTestApp(filePath);
  }
});

// ドロップされたファイルを処理（実ファイルパスを使用）
ipcMain.handle('process-dropped-file-with-path', async (event, fileData: {
  name: string;
  size: number;
  type: string;
  path: string; // Real file path
}) => {
  try {
    console.log('Processing dropped file with path:', fileData.path);
    console.log('File info:', { name: fileData.name, size: fileData.size, type: fileData.type });
    
    // 一時出力ファイルパスを生成
    const tempOutputPath = path.join(app.getPath('temp'), `thumbnail_${Date.now()}.png`);
    
    // 実ファイルパスを使ってサムネイル生成（アイコンフォールバック付き）
    const result = await getFileThumbnailBase64(fileData.path, 256);
    
    if (result.success) {
      return {
        success: true,
        name: fileData.name,
        size: fileData.size,
        type: fileData.type,
        path: fileData.path,
        preview: result.base64
      };
    } else {
      console.error('Thumbnail generation failed for dropped file:', result.error);
      return {
        success: false,
        name: fileData.name,
        size: fileData.size,
        type: fileData.type,
        path: fileData.path,
        error: result.error
      };
    }
  } catch (error) {
    console.error('Error processing dropped file:', error);
    return {
      success: false,
      name: fileData.name,
      size: fileData.size,
      type: fileData.type,
      path: fileData.path,
      error: (error as Error).message
    };
  }
});

// フォールバック関数: TestApp.exe を使用
async function fallbackToTestApp(filePath: string) {
  try {
    // まずプレビューを生成
    const previewResult = await new Promise((resolve, reject) => {
      // TestApp.exeのパスを取得
      const resourcesPath = isDev 
        ? path.join(__dirname, '../../resources')
        : path.join(process.resourcesPath, 'resources');
      
      const testAppPath = path.join(resourcesPath, 'TestApp.exe');
      
      // 一時ファイルを生成
      const tempOutputPath = path.join(app.getPath('temp'), `preview_${Date.now()}.png`);
      
      console.log('Fallback: TestApp path:', testAppPath);
      console.log('Fallback: Input file:', filePath);
      console.log('Fallback: Output file:', tempOutputPath);
      
      // TestApp.exe を実行してプレビューを生成
      const child = spawn(testAppPath, [filePath, tempOutputPath, '256'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath: tempOutputPath,
            message: stdout
          });
        } else {
          reject({
            success: false,
            error: stderr || `Process exited with code ${code}`,
            code
          });
        }
      });
      
      child.on('error', (error) => {
        reject({
          success: false,
          error: error.message
        });
      });
    }) as any;
    
    if (previewResult.success) {
      const fs = await import('fs/promises');
      const imageBuffer = await fs.readFile(previewResult.outputPath);
      const base64 = imageBuffer.toString('base64');
      
      // 一時ファイルを削除
      try {
        await fs.unlink(previewResult.outputPath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }
      
      return {
        success: true,
        base64: `data:image/png;base64,${base64}`,
        originalPath: filePath
      };
    } else {
      throw new Error(previewResult.error);
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// ファイルパス取得のためのIPC
ipcMain.handle('get-file-path', async (event, fileName: string) => {
  // TODO: 実際のファイルパス解決ロジックを実装
  // 現在は仮の実装
  return `C:\\Users\\motoi\\Downloads\\${fileName}`;
});

// Initialize app settings if first run
if (!store.has('initialized')) {
  store.set('settings', {
    baseFolder: app.getPath('documents'),
    workingPeriod: '',
    apiServer: {
      url: 'http://localhost:8080',
      currentPeriod: ''
    },
    previewServer: {
      url: 'http://localhost:8081'
    },
    mbsLicense: {
      name: '',
      product: '',
      yearMonth: '',
      serialKey: ''
    }
  });
  store.set('initialized', true);
}