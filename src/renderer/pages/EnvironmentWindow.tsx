import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Settings {
  baseFolder: string;
  apiServer?: {
    url: string;
    currentPeriod: string;
  };
  previewServer?: {
    url: string;
  };
  mbsLicense?: {
    name: string;
    product: string;
    yearMonth: string;
    serialKey: string;
  };
  dealTypes?: {
    receipt: boolean;
    invoice: boolean;
    delivery: boolean;
    other: boolean;
  };
  windowSettings?: {
    periodWindow: {
      sortByTime: boolean;
      showOnStartup: boolean;
    };
    allPeriodsWindow: {
      sortByTime: boolean;
    };
  };
}

const EnvironmentWindow: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('server');
  const [settings, setSettings] = useState<Settings>({
    baseFolder: '',
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
    },
    dealTypes: {
      receipt: true,
      invoice: true,
      delivery: true,
      other: true
    },
    windowSettings: {
      periodWindow: {
        sortByTime: true,
        showOnStartup: false
      },
      allPeriodsWindow: {
        sortByTime: true
      }
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const stored = await window.electronAPI.store.get('settings');
    if (stored) {
      setSettings(prev => ({ ...prev, ...stored }));
    }
  };

  const handleSave = async () => {
    try {
      // 設定を保存
      await window.electronAPI.store.set('settings', settings);
      
      // APIクライアントの設定も更新
      if (settings.apiServer?.url) {
        await window.electronAPI.api.setConfig({
          denchokunServerUrl: settings.apiServer.url
        });
      }

      await window.electronAPI.showMessageBox({
        type: 'info',
        title: '設定保存',
        message: '設定を保存しました。',
        buttons: ['OK']
      });
    } catch (error) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'エラー',
        message: `設定の保存に失敗しました。\nエラー: ${error}`,
        buttons: ['OK']
      });
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  const handleTestConnection = async () => {
    if (!settings.apiServer?.url) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: '接続テストエラー',
        message: 'APIサーバーURLを入力してください。',
        buttons: ['OK']
      });
      return;
    }

    try {
      // 一時的にAPIクライアントの設定を更新してテスト
      await window.electronAPI.api.setConfig({
        denchokunServerUrl: settings.apiServer.url
      });

      const result = await window.electronAPI.api.healthCheck('denchokun');
      
      if (result.status === 'ok') {
        await window.electronAPI.showMessageBox({
          type: 'info',
          title: '接続テスト成功',
          message: 'APIサーバーに正常に接続できました。',
          buttons: ['OK']
        });
      } else {
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: '接続テスト失敗',
          message: `APIサーバーに接続できませんでした。\nエラー: ${result.error}`,
          buttons: ['OK']
        });
      }
    } catch (error) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: '接続テスト失敗',
        message: `APIサーバーに接続できませんでした。\nエラー: ${error}`,
        buttons: ['OK']
      });
    }
  };

  const renderServerSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          サーバー：
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={settings.apiServer?.url || ''}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              apiServer: {
                ...prev.apiServer!,
                url: e.target.value
              }
            }))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            placeholder="http://localhost:8080"
          />
          <button
            onClick={handleTestConnection}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm"
          >
            接続テスト
          </button>
        </div>
      </div>

    </div>
  );

  const renderDealTypeSettings = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">取引種別設定</h3>
      <div className="space-y-3">
        {[
          { key: 'receipt', label: '領収書' },
          { key: 'invoice', label: '請求書' },
          { key: 'delivery', label: '納品書' },
          { key: 'other', label: 'その他' }
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center">
            <input
              type="checkbox"
              id={`dealType-${key}`}
              checked={settings.dealTypes?.[key as keyof typeof settings.dealTypes] || false}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                dealTypes: {
                  ...prev.dealTypes!,
                  [key]: e.target.checked
                }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`dealType-${key}`} className="ml-2 text-sm text-gray-700">
              {label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWindowSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">期間ウィンドウ</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="periodWindow-sortByTime"
              checked={settings.windowSettings?.periodWindow.sortByTime || false}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                windowSettings: {
                  ...prev.windowSettings!,
                  periodWindow: {
                    ...prev.windowSettings!.periodWindow,
                    sortByTime: e.target.checked
                  }
                }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="periodWindow-sortByTime" className="ml-2 text-sm text-gray-700">
              検索結果を時順
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="periodWindow-showOnStartup"
              checked={settings.windowSettings?.periodWindow.showOnStartup || false}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                windowSettings: {
                  ...prev.windowSettings!,
                  periodWindow: {
                    ...prev.windowSettings!.periodWindow,
                    showOnStartup: e.target.checked
                  }
                }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="periodWindow-showOnStartup" className="ml-2 text-sm text-gray-700">
              起動時に表示する
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">全期間ウィンドウ</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allPeriodsWindow-sortByTime"
              checked={settings.windowSettings?.allPeriodsWindow.sortByTime || false}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                windowSettings: {
                  ...prev.windowSettings!,
                  allPeriodsWindow: {
                    ...prev.windowSettings!.allPeriodsWindow,
                    sortByTime: e.target.checked
                  }
                }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allPeriodsWindow-sortByTime" className="ml-2 text-sm text-gray-700">
              検索結果を時順
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMainContent = () => {
    switch (selectedCategory) {
      case 'server':
        return renderServerSettings();
      case 'dealTypes':
        return renderDealTypeSettings();
      case 'windows':
        return renderWindowSettings();
      default:
        return renderServerSettings();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">環境設定</h2>
          <nav className="space-y-1">
            <button
              onClick={() => setSelectedCategory('server')}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                selectedCategory === 'server'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              サーバー設定
            </button>
            <button
              onClick={() => setSelectedCategory('dealTypes')}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                selectedCategory === 'dealTypes'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              取引種別
            </button>
            <button
              onClick={() => setSelectedCategory('windows')}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                selectedCategory === 'windows'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              ウィンドウ設定
            </button>
          </nav>
        </div>

        {/* Add/Remove buttons at bottom of sidebar */}
        <div className="absolute bottom-16 left-4 flex space-x-2">
          <button className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-gray-600">
            +
          </button>
          <button className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-gray-600">
            −
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6 overflow-auto">
          {renderMainContent()}
        </div>

        {/* Bottom Buttons */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              閉じる
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentWindow;

