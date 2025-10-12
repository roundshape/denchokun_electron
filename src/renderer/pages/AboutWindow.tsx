import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AboutWindow: React.FC = () => {
  const navigate = useNavigate();
  const [showLicenses, setShowLicenses] = useState(false);

  const licenses = [
    { name: 'Electron', version: '38.1.2', license: 'MIT', url: 'https://github.com/electron/electron' },
    { name: 'React', version: '19.1.1', license: 'MIT', url: 'https://reactjs.org/' },
    { name: 'React Router', version: '7.9.1', license: 'MIT', url: 'https://reactrouter.com/' },
    { name: 'Vite', version: '7.1.6', license: 'MIT', url: 'https://vitejs.dev/' },
    { name: 'TypeScript', version: '5.9.2', license: 'Apache-2.0', url: 'https://www.typescriptlang.org/' },
    { name: 'Tailwind CSS', version: '3.4.17', license: 'MIT', url: 'https://tailwindcss.com/' },
    { name: 'Electron Store', version: '8.1.0', license: 'MIT', url: 'https://github.com/sindresorhus/electron-store' },
    { name: 'Axios', version: '1.12.2', license: 'MIT', url: 'https://axios-http.com/' },
    { name: 'Koffi', version: '2.14.1', license: 'MIT', url: 'https://github.com/Koromix/koffi' },
    { name: 'WinShellPreview', version: '1.0.0', license: 'MIT', url: 'https://github.com/roundshape/winshellpreviewWIN32' },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            電帳君 (Denchokun)
          </h2>

          <p className="text-gray-600 mb-1">
            Version 2.0.0 (Electron版)
          </p>

          <p className="text-sm text-gray-500 mb-6">
            電子帳簿保存法対応デジタル帳簿管理システム
          </p>

          <div className="text-sm text-gray-600 space-y-2 mb-6">
            <p>開発: RoundShape K.K.</p>
            <p>
              <a
                href="https://www.roundshape.jp"
                className="text-blue-600 hover:underline cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  window.electronAPI.shell.openExternal('https://www.roundshape.jp');
                }}
              >
                www.roundshape.jp
              </a>
            </p>
          </div>

          <div className="border-t pt-4 mb-6">
            <p className="text-xs text-gray-500 mb-2">
              このソフトウェアはMITライセンスの下で配布されています。
            </p>
            <p className="text-xs text-gray-500">
              旧Xojo版からElectronで完全リニューアル
            </p>
          </div>

          {/* ライセンス情報セクション */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowLicenses(!showLicenses)}
              className="text-sm text-blue-600 hover:text-blue-800 underline mb-3"
            >
              {showLicenses ? 'ライセンス情報を非表示' : '使用ライブラリのライセンス情報を表示'}
            </button>

            {showLicenses && (
              <div className="text-left bg-gray-50 rounded p-4 max-h-64 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">使用しているオープンソースライブラリ</h3>
                <div className="space-y-3">
                  {licenses.map((lib, index) => (
                    <div key={index} className="text-xs border-b border-gray-200 pb-2 last:border-b-0">
                      <div className="font-semibold text-gray-800">{lib.name} {lib.version}</div>
                      <div className="text-gray-600">License: {lib.license}</div>
                      <a
                        href={lib.url}
                        className="text-blue-600 hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          window.electronAPI.shell.openExternal(lib.url);
                        }}
                      >
                        {lib.url}
                      </a>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4 pt-3 border-t">
                  これらのライブラリに深く感謝します。
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="btn-primary mt-6"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutWindow;