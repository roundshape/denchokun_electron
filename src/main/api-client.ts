import { ipcMain } from 'electron';
const Store = require('electron-store');

interface ApiConfig {
  denchokunServerUrl: string;
  previewServerUrl: string;
  currentPeriod?: string;
}

class ApiClient {
  private config: ApiConfig;
  private store: any;

  constructor() {
    this.store = new Store();
    
    // electron-storeから設定を読み込み
    const settings = this.store.get('settings', {});
    this.config = {
      denchokunServerUrl: settings.apiServer?.url || 'http://localhost:8080',
      previewServerUrl: settings.previewServer?.url || 'http://localhost:8081',
      currentPeriod: settings.apiServer?.currentPeriod || ''
    };
    
    this.setupIPCHandlers();
  }

  private setupIPCHandlers() {
    // API設定の取得・更新
    ipcMain.handle('api-config-get', () => {
      return this.config;
    });

    ipcMain.handle('api-config-set', (event, newConfig: Partial<ApiConfig>) => {
      this.config = { ...this.config, ...newConfig };
      
      // electron-storeにも保存
      const settings = this.store.get('settings', {});
      const updatedSettings = {
        ...settings,
        apiServer: {
          ...settings.apiServer,
          url: this.config.denchokunServerUrl,
          currentPeriod: this.config.currentPeriod || ''
        },
        previewServer: {
          ...settings.previewServer,
          url: this.config.previewServerUrl
        }
      };
      this.store.set('settings', updatedSettings);
      
      return this.config;
    });

    // 汎用APIリクエスト
    ipcMain.handle('api-request', async (event, options: {
      server: 'denchokun' | 'preview';
      endpoint: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: any;
      headers?: Record<string, string>;
    }) => {
      const baseUrl = options.server === 'denchokun' 
        ? this.config.denchokunServerUrl 
        : this.config.previewServerUrl;
      
      const url = `${baseUrl}${options.endpoint}`;
      const method = options.method || 'GET';

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          body: options.data ? JSON.stringify(options.data) : undefined
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text();
        }
      } catch (error) {
        console.error('API Request failed:', error);
        throw error;
      }
    });

    // 取引データ関連のAPI
    ipcMain.handle('api-transactions-list', async (event, periodId?: string) => {
      return this.apiRequest('denchokun', `/v1/api/transactions${periodId ? `?period=${periodId}` : ''}`);
    });

    ipcMain.handle('api-transactions-create', async (event, transactionData: any) => {
      return this.apiRequest('denchokun', '/v1/api/transactions', 'POST', transactionData);
    });

    ipcMain.handle('api-transactions-update', async (event, id: number, transactionData: any) => {
      return this.apiRequest('denchokun', `/v1/api/transactions/${id}`, 'PUT', transactionData);
    });

    ipcMain.handle('api-transactions-delete', async (event, id: number) => {
      return this.apiRequest('denchokun', `/v1/api/transactions/${id}`, 'DELETE');
    });

    // 期間管理関連のAPI
    ipcMain.handle('api-periods-list', async () => {
      return this.apiRequest('denchokun', '/v1/api/periods');
    });

    ipcMain.handle('api-periods-create', async (event, periodData: any) => {
      return this.apiRequest('denchokun', '/v1/api/periods', 'POST', periodData);
    });

    // 取引先マスター関連のAPI
    ipcMain.handle('api-partners-list', async () => {
      return this.apiRequest('denchokun', '/v1/api/partners');
    });

    ipcMain.handle('api-partners-create', async (event, partnerData: any) => {
      return this.apiRequest('denchokun', '/v1/api/partners', 'POST', partnerData);
    });

    // 書類種別マスター関連のAPI
    ipcMain.handle('api-doctypes-list', async () => {
      return this.apiRequest('denchokun', '/v1/api/doc-types');
    });

    // ファイルアップロード
    ipcMain.handle('api-file-upload', async (event, filePath: string, metadata?: any) => {
      // TODO: FormDataを使ったファイルアップロード実装
      return this.apiRequest('denchokun', '/v1/api/files/upload', 'POST', {
        filePath,
        metadata
      });
    });

    // プレビューサーバー関連
    ipcMain.handle('api-preview-generate', async (event, fileId: string) => {
      return this.apiRequest('preview', `/api/preview/${fileId}`);
    });

    // ヘルスチェック
    ipcMain.handle('api-health-check', async (event, server: 'denchokun' | 'preview') => {
      try {
        const result = await this.apiRequest(server, '/v1/api/health');
        return { status: 'ok', data: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { status: 'error', error: errorMessage };
      }
    });
  }

  private async apiRequest(
    server: 'denchokun' | 'preview',
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ) {
    const baseUrl = server === 'denchokun' 
      ? this.config.denchokunServerUrl 
      : this.config.previewServerUrl;
    
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  }
}

export default ApiClient;
