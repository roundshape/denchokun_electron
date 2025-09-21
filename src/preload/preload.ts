import { contextBridge, ipcRenderer } from 'electron';

// Define the API exposed to the renderer
const api = {
  // File operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: (options?: any) => ipcRenderer.invoke('select-file', options),
  selectFiles: (options?: any) => ipcRenderer.invoke('select-files', options),

  // Dialog operations
  showMessageBox: (options: any) => ipcRenderer.invoke('show-message-box', options),

  // App paths
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  // Store operations
  store: {
    get: (key: string, defaultValue?: any) => ipcRenderer.invoke('get-store-value', key, defaultValue),
    set: (key: string, value: any) => ipcRenderer.invoke('set-store-value', key, value),
    delete: (key: string) => ipcRenderer.invoke('delete-store-value', key)
  },

  // Database operations (will be implemented)
  db: {
    execute: (query: string, params?: any[]) => ipcRenderer.invoke('db-execute', query, params),
    get: (query: string, params?: any[]) => ipcRenderer.invoke('db-get', query, params),
    all: (query: string, params?: any[]) => ipcRenderer.invoke('db-all', query, params),
    run: (query: string, params?: any[]) => ipcRenderer.invoke('db-run', query, params)
  },

  // File system operations
  fs: {
    readFile: (path: string) => ipcRenderer.invoke('fs-read-file', path),
    writeFile: (path: string, data: any) => ipcRenderer.invoke('fs-write-file', path, data),
    exists: (path: string) => ipcRenderer.invoke('fs-exists', path),
    mkdir: (path: string) => ipcRenderer.invoke('fs-mkdir', path),
    readdir: (path: string) => ipcRenderer.invoke('fs-readdir', path),
    stat: (path: string) => ipcRenderer.invoke('fs-stat', path),
    copyFile: (src: string, dest: string) => ipcRenderer.invoke('fs-copy-file', src, dest),
    unlink: (path: string) => ipcRenderer.invoke('fs-unlink', path)
  },

  // Crypto operations
  crypto: {
    hash: (data: string, algorithm?: string) => ipcRenderer.invoke('crypto-hash', data, algorithm)
  },

  // Menu event listeners
  onMenuAction: (callback: (action: string) => void) => {
    const events = [
      'menu-new-transaction',
      'menu-import',
      'menu-export',
      'menu-new-period',
      'menu-manage-periods',
      'menu-partners-master',
      'menu-doctype-master',
      'menu-about'
    ];

    events.forEach(event => {
      ipcRenderer.on(event, () => callback(event));
    });
  },

  // Remove menu listeners
  removeMenuListeners: () => {
    ipcRenderer.removeAllListeners('menu-new-transaction');
    ipcRenderer.removeAllListeners('menu-import');
    ipcRenderer.removeAllListeners('menu-export');
    ipcRenderer.removeAllListeners('menu-new-period');
    ipcRenderer.removeAllListeners('menu-manage-periods');
    ipcRenderer.removeAllListeners('menu-partners-master');
    ipcRenderer.removeAllListeners('menu-doctype-master');
    ipcRenderer.removeAllListeners('menu-about');
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', api);

// TypeScript declarations for the API
export type ElectronAPI = typeof api;

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}