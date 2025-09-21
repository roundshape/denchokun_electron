import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MainWindow: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2024-01');
  const [periods, setPeriods] = useState<any[]>([]);
  
  // 取引入力フォームの状態
  const [dealDate, setDealDate] = useState<string>('V');
  const [amount, setAmount] = useState<string>('');
  const [partner, setPartner] = useState<string>('V');
  const [dealName, setDealName] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [docType, setDocType] = useState<string>('領収書');
  const [dragOver, setDragOver] = useState<boolean>(false);

  useEffect(() => {
    loadPeriods();
    checkInitialSetup();
  }, []);

  const checkInitialSetup = async () => {
    try {
      const settings = await window.electronAPI.store.get('settings');
      if (!settings?.baseFolder) {
        navigate('/setup');
      }
    } catch (error) {
      console.error('設定確認エラー:', error);
    }
  };

  const loadPeriods = async () => {
    try {
      // TODO: データベースから期間一覧を取得
      setPeriods([
        { id: '2024-01', name: '2024年01月', start_date: '2024-01-01', end_date: '2024-01-31' },
        { id: '2024-02', name: '2024年02月', start_date: '2024-02-01', end_date: '2024-02-29' },
        { id: '2024-03', name: '2024年03月', start_date: '2024-03-01', end_date: '2024-03-31' }
      ]);
    } catch (error) {
      console.error('期間読み込みエラー:', error);
    }
  };

  // イベントハンドラー
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    console.log('Dropped files:', files);
    // TODO: ファイル処理を実装
  };

  const handleReset = () => {
    setDealDate('V');
    setAmount('');
    setPartner('V');
    setDealName('');
    setRemarks('');
    setDocType('領収書');
  };

  const handleSubmit = async () => {
    if (!amount || !partner || !dealName) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: '入力エラー',
        message: '必須項目を入力してください。',
        buttons: ['OK']
      });
      return;
    }

    try {
      // TODO: データベースに保存する処理を実装
      console.log('取引データを保存:', {
        dealDate,
        amount,
        partner,
        dealName,
        remarks,
        docType,
        period: selectedPeriod
      });

      await window.electronAPI.showMessageBox({
        type: 'info',
        title: '登録完了',
        message: '取引が正常に登録されました。',
        buttons: ['OK']
      });

      handleReset();
    } catch (error) {
      console.error('保存エラー:', error);
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'エラー',
        message: '取引の保存に失敗しました。',
        buttons: ['OK']
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header with Host and Period */}
      <div className="bg-gray-100 px-4 py-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">ホスト：</span>
              <span className="text-sm font-mono">http://localhost:8080</span>
              <button className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded">
                管理
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/periods')}
              className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              期間管理
            </button>
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-gray-100 px-4 py-2 border-b">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">取引期間：</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="2024-01">2024-01</option>
              <option value="2024-02">2024-02</option>
              <option value="2024-03">2024-03</option>
            </select>
            <button className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded">
              期間表示
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-6 h-full">
          {/* Left Column - Input Form */}
          <div className="space-y-4">
            {/* Deal Date and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">取引日：</label>
                <input
                  type="text"
                  value={dealDate}
                  onChange={(e) => setDealDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">取引種別：</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="領収書">領収書</option>
                  <option value="請求書">請求書</option>
                  <option value="納品書">納品書</option>
                  <option value="見積書">見積書</option>
                </select>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">金額：</label>
              <div className="flex items-center">
                <span className="text-sm text-gray-700 mr-2">¥</span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Partner */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">取引先：</label>
              <input
                type="text"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Deal Name */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">取引名：</label>
              <input
                type="text"
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">備考：</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Right Column - File Drop Area and Buttons */}
          <div className="flex flex-col">
            {/* File Drop Area */}
            <div
              className={`flex-1 border-2 border-dashed ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              } rounded-lg flex items-center justify-center mb-4`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-center text-gray-500">
                <p>ここに登録するファイルをドロップ</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                リセット
              </button>
              <button
                onClick={handleSubmit}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                登録
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainWindow;