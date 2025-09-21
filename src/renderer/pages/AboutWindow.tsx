import React from 'react';
import { useNavigate } from 'react-router-dom';

const AboutWindow: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
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
                  window.electronAPI.shell?.openExternal('https://www.roundshape.jp');
                }}
              >
                www.roundshape.jp
              </a>
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 mb-4">
              このソフトウェアはMITライセンスの下で配布されています。
            </p>
            <p className="text-xs text-gray-500">
              旧Xojo版からElectronで完全リニューアル
            </p>
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