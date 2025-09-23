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
}

const SetupWindow: React.FC = () => {
  const navigate = useNavigate();
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
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const stored = await window.electronAPI.store.get('settings');
    if (stored) {
      setSettings(stored);
    }
  };

  const handleSelectFolder = async () => {
    const folder = await window.electronAPI.selectFolder();
    if (folder) {
      setSettings(prev => ({ ...prev, baseFolder: folder }));
    }
  };

  const handleSave = async () => {
    if (!settings.baseFolder) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: '設定エラー',
        message: 'ベースフォルダを選択してください。',
        buttons: ['OK']
      });
      return;
    }

    if (!settings.apiServer?.url) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: '設定エラー',
        message: 'APIサーバーURLを入力してください。',
        buttons: ['OK']
      });
      return;
    }

    // 設定を保存
    await window.electronAPI.store.set('settings', settings);
    
    // APIクライアントの設定も更新
    await window.electronAPI.api.setConfig({
      denchokunServerUrl: settings.apiServer.url,
      previewServerUrl: settings.previewServer?.url || 'http://localhost:8081',
      currentPeriod: settings.apiServer.currentPeriod
    });

    await window.electronAPI.showMessageBox({
      type: 'info',
      title: '設定完了',
      message: '設定を保存しました。',
      buttons: ['OK']
    });
    navigate('/');
  };

  const handleCancel = () => {
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
        denchokunServerUrl: settings.apiServer.url,
        previewServerUrl: settings.previewServer?.url || 'http://localhost:8081',
        currentPeriod: settings.apiServer.currentPeriod
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          電帳君 - 初期設定
        </h2>

        <div className="space-y-6">
          {/* Base Folder Setting */}
          <div>
            <label className="form-label">
              データ保存フォルダ
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={settings.baseFolder}
                readOnly
                className="form-input flex-1"
                placeholder="フォルダを選択してください"
              />
              <button
                onClick={handleSelectFolder}
                className="btn-secondary"
              >
                選択
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              取引データと関連ファイルが保存されるフォルダです。
            </p>
          </div>

          {/* API Server Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              APIサーバー設定
            </h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">
                  電帳君サーバーURL
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
                    className="form-input flex-1"
                    placeholder="http://localhost:8080"
                  />
                  <button
                    onClick={handleTestConnection}
                    className="btn-secondary whitespace-nowrap"
                  >
                    接続テスト
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  電帳君APIサーバーのURLを指定してください。
                </p>
              </div>
              <div>
                <label className="form-label">
                  現在の期間ID
                </label>
                <input
                  type="text"
                  value={settings.apiServer?.currentPeriod || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    apiServer: {
                      ...prev.apiServer!,
                      currentPeriod: e.target.value
                    }
                  }))}
                  className="form-input"
                  placeholder="例: 2024-01"
                />
                <p className="mt-1 text-sm text-gray-500">
                  現在作業中の期間IDを指定してください（オプション）。
                </p>
              </div>
              <div>
                <label className="form-label">
                  プレビューサーバーURL
                </label>
                <input
                  type="text"
                  value={settings.previewServer?.url || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    previewServer: {
                      ...prev.previewServer!,
                      url: e.target.value
                    }
                  }))}
                  className="form-input"
                  placeholder="http://localhost:8081"
                />
                <p className="mt-1 text-sm text-gray-500">
                  プレビュー生成サーバーのURLを指定してください。
                </p>
              </div>
            </div>
          </div>

          {/* MBS License (Optional for now) */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              ライセンス情報（オプション）
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  名前
                </label>
                <input
                  type="text"
                  value={settings.mbsLicense?.name || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    mbsLicense: {
                      ...prev.mbsLicense!,
                      name: e.target.value
                    }
                  }))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">
                  製品
                </label>
                <input
                  type="text"
                  value={settings.mbsLicense?.product || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    mbsLicense: {
                      ...prev.mbsLicense!,
                      product: e.target.value
                    }
                  }))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">
                  年月
                </label>
                <input
                  type="text"
                  value={settings.mbsLicense?.yearMonth || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    mbsLicense: {
                      ...prev.mbsLicense!,
                      yearMonth: e.target.value
                    }
                  }))}
                  className="form-input"
                  placeholder="YYYY-MM"
                />
              </div>
              <div>
                <label className="form-label">
                  シリアルキー
                </label>
                <input
                  type="text"
                  value={settings.mbsLicense?.serialKey || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    mbsLicense: {
                      ...prev.mbsLicense!,
                      serialKey: e.target.value
                    }
                  }))}
                  className="form-input"
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              旧バージョンとの互換性のため、ライセンス情報を保持できます。
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="btn-secondary"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupWindow;