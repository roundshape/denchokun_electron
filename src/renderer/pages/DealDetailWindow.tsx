import React, { useState, useEffect } from 'react';

interface Deal {
  NO: string;
  DealType: string;
  DealDate: string;
  DealName: string;
  DealPartner: string;
  DealPrice: number;
  DealRemark?: string;
  RecStatus: string;
  FilePath?: string;
  Hash?: string;
  RecUpdate?: string;
  RegDate?: string;
  nextNO?: string | null;
  prevNO?: string | null;
  baseNO?: string;
}

const DealDetailWindow: React.FC = () => {
  const [originalDeal, setOriginalDeal] = useState<Deal | null>(null);
  const [isLatestVersion, setIsLatestVersion] = useState<boolean>(true); // 最新版かどうか
  
  // 期間関連
  const [periods, setPeriods] = useState<{name: string, fromDate: string, toDate: string}[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  
  // 編集可能なフィールド
  const [dealDate, setDealDate] = useState<string>('');
  const [docType, setDocType] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [displayAmount, setDisplayAmount] = useState<string>('');
  const [partner, setPartner] = useState<string>('');
  const [dealName, setDealName] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  
  // ファイルドロップ関連
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [droppedFiles, setDroppedFiles] = useState<{name: string, path: string, size: number, type: string, preview?: string, fileObject?: File}[]>([]);
  const [isNewFile, setIsNewFile] = useState<boolean>(false); // 新しいファイルがドロップされたかどうか
  
  // メッセージ
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // URLパラメータから取引データを取得
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const dealDataStr = urlParams.get('deal');
    
    if (dealDataStr) {
      try {
        const dealData = JSON.parse(decodeURIComponent(dealDataStr));
        console.log('Received deal data:', dealData);
        console.log('NO:', dealData.NO);
        console.log('Period:', dealData._period);
        
        setOriginalDeal(dealData);
        
        // 更新可能かどうかを判定（RecStatusがNEWの場合のみ更新可能）
        setIsLatestVersion(dealData.RecStatus === 'NEW');
        
        // フィールドに値を設定
        setDealDate(dealData.DealDate || '');
        setDocType(dealData.DealType || '領収書');
        setAmount(dealData.DealPrice?.toString() || '');
        setDisplayAmount(formatAmount(dealData.DealPrice || 0));
        setPartner(dealData.DealPartner || '');
        setDealName(dealData.DealName || '');
        setRemarks(dealData.DealRemark || '');
        
        // 親から渡された期間を設定
        if (dealData._period) {
          setSelectedPeriod(dealData._period);
        }
        
        const versionLabel = dealData.RecStatus === 'NEW' ? '' : ' (過去のバージョン)';
        document.title = `更新 - ${dealData.NO}${versionLabel}`;
        
        // 過去のバージョンの場合はメッセージを表示
        if (dealData.RecStatus !== 'NEW') {
          setMessage('⚠ これは過去のバージョンです。更新はできません。');
        }
      } catch (error) {
        console.error('取引データのパースエラー:', error);
      }
    }
    
    // 期間データを読み込み
    loadPeriods();
  }, []);

  // 期間が設定されたら既存ファイルのプレビューを読み込む
  useEffect(() => {
    if (selectedPeriod && originalDeal && originalDeal.FilePath) {
      loadExistingFilePreview(originalDeal.NO, selectedPeriod);
    }
  }, [selectedPeriod, originalDeal]);

  const loadPeriods = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.api.request({
          server: 'denchokun',
          endpoint: '/v1/api/periods',
          method: 'GET'
        });
        if (result.success && result.periods && Array.isArray(result.periods)) {
          setPeriods(result.periods);
          // selectedPeriodは親から渡された値を使うので、ここでは自動選択しない
        }
      }
    } catch (error) {
      console.error('期間読み込みエラー:', error);
    }
  };

  const loadExistingFilePreview = async (dealNo: string, period: string) => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI && originalDeal) {
        // プレビューリンクを取得
        const result = await window.electronAPI.api.request({
          server: 'denchokun',
          endpoint: `/v1/api/preview-link?period=${encodeURIComponent(period)}&dealId=${encodeURIComponent(dealNo)}&width=256`,
          method: 'GET'
        });
        
        if (result.success && result.url) {
          // ファイル情報を設定
          setDroppedFiles([{
            name: originalDeal.FilePath || 'ファイル',
            path: originalDeal.FilePath || '',
            size: result.size || 0,
            type: result.type || '',
            preview: result.url
          }]);
          setIsNewFile(false); // 既存ファイル
          setMessage(`既存ファイルのプレビューを読み込みました`);
        }
      }
    } catch (error) {
      console.error('プレビュー読み込みエラー:', error);
      setMessage('プレビューの読み込みに失敗しました');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return 'サイズ不明';
    if (bytes < 1024 * 1024) {
      // 1MB未満はKB表示
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      // 1MB以上はMB表示
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }
  };

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('ja-JP');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAmount(value);
    if (value) {
      const numValue = parseInt(value, 10);
      setDisplayAmount(formatAmount(numValue));
    } else {
      setDisplayAmount('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      try {
        if (typeof window !== 'undefined' && window.electronAPI) {
          const filePath = window.electronAPI.files.getPathForFile(file);
          const previewResult = await window.electronAPI.preview.getPreviewBase64(filePath);
          
          const fileData = {
            name: file.name,
            path: filePath,
            size: file.size,
            type: file.type,
            preview: previewResult.success ? previewResult.base64 : undefined,
            fileObject: file
          };
          
          setDroppedFiles([fileData]); // 1つのファイルのみ
          setIsNewFile(true); // 新しいファイルがドロップされた
        }
      } catch (error) {
        console.error('ファイル処理エラー:', error);
      }
    }
  };

  const handleRemoveFile = () => {
    setDroppedFiles([]);
  };

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      window.close();
    }
  };

  const handleUpdate = async () => {
    if (!originalDeal) {
      setMessage('エラー: 取引データが見つかりません');
      return;
    }

    if (!isLatestVersion) {
      setMessage('エラー: 過去のバージョンは更新できません');
      return;
    }

    // バリデーション
    if (!dealDate) {
      setMessage('取引日を入力してください');
      return;
    }
    if (!amount || parseInt(amount) <= 0) {
      setMessage('金額を入力してください');
      return;
    }
    if (!partner) {
      setMessage('取引先を入力してください');
      return;
    }
    if (!dealName) {
      setMessage('取引名を入力してください');
      return;
    }

    try {
      setMessage('更新中...');
      
      // リクエストボディを構築
      const requestBody: any = {
        period: selectedPeriod,
        dealData: {
          DealType: docType,
          DealDate: dealDate,
          DealName: dealName,
          DealPartner: partner,
          DealPrice: parseInt(amount),
          DealRemark: remarks,
          RecStatus: 'UPDATE'
        }
      };

      // 新しいファイルがドロップされている場合
      if (isNewFile && droppedFiles.length > 0 && droppedFiles[0].fileObject) {
        const file = droppedFiles[0];
        
        if (!file.fileObject) {
          setMessage('エラー: ファイルオブジェクトが見つかりません');
          return;
        }
        
        // ファイルをBase64に変換
        const base64Data = await fileToBase64(file.fileObject);
        
        // ファイル名を生成（取引日_取引先_金額.拡張子）
        const extension = file.name.split('.').pop();
        const apiFileName = `${dealDate}_${partner}_${amount}.${extension}`;
        
        requestBody.fileData = {
          name: file.name,
          path: apiFileName,
          size: file.size,
          base64Data: base64Data
        };
      }

      // API呼び出し
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.api.request({
          server: 'denchokun',
          endpoint: `/v1/api/deals/${originalDeal.NO}`,
          method: 'PUT',
          data: requestBody
        });

        if (result.success) {
          setMessage(`更新が完了しました`);
          // 親ウィンドウに更新を通知
          if (window.electronAPI) {
            window.electronAPI.notifyDealUpdated();
          }
        } else {
          setMessage(`更新に失敗しました: ${result.message || result.error || '不明なエラー'}`);
        }
      }
    } catch (error) {
      console.error('更新エラー:', error);
      setMessage(`更新に失敗しました: ${(error as Error).message}`);
    }
  };

  // ファイルをBase64に変換
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]; // data:image/png;base64, の部分を除去
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  if (!originalDeal) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex-1 overflow-auto px-2 py-1">
        <div className="flex gap-2">
          {/* Left Column - Input Fields */}
          <div className="flex-1 space-y-1">
            {/* 取引期間 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">取引期間：</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                disabled={periods.length === 0}
              >
                {periods.length === 0 ? (
                  <option value="">期間データが取得できません</option>
                ) : (
                  periods.map((period) => (
                    <option key={period.name} value={period.name}>
                      {period.name} ({period.fromDate || '未設定'} ～ {period.toDate || '未設定'})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 取引日と取引種別 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">取引日：</label>
                <input
                  type="date"
                  value={dealDate}
                  onChange={(e) => setDealDate(e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">取引種別：</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="領収書">領収書</option>
                  <option value="請求書">請求書</option>
                  <option value="納品書">納品書</option>
                  <option value="見積書">見積書</option>
                </select>
              </div>
            </div>

            {/* 金額 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">金額：</label>
              <div className="flex items-center">
                <span className="text-sm text-gray-700 mr-2">¥</span>
                <input
                  type="text"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-right"
                />
              </div>
            </div>

            {/* 取引先 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">取引先：</label>
              <input
                type="text"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 取引名 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">取引名：</label>
              <input
                type="text"
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 備考 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">備考：</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="備考を入力..."
                className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Right Column - File Drop Area */}
          <div className="flex flex-col items-end" style={{ width: '320px' }}>
            {/* File Drop Area */}
            <div
              className={`border-2 border-dashed ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-400'
              } rounded-lg overflow-hidden relative transition-colors duration-200`}
              style={{ width: '300px', height: '300px' }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {droppedFiles.length === 0 ? (
                <div className="flex items-center justify-center h-full p-6">
                  <div className="text-center">
                    <div className="mb-4">
                      <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">ここに登録するファイルをドロップ</p>
                  </div>
                </div>
              ) : (
                // ファイルプレビュー
                <div className="relative h-full">
                  {droppedFiles[0].preview ? (
                    <img
                      src={droppedFiles[0].preview}
                      alt={droppedFiles[0].name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-4">
                        <div className="text-4xl mb-2">📄</div>
                        <div className="text-xs text-gray-600 break-all">{droppedFiles[0].name}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ファイルパス表示エリア */}
            <div className="mt-2 w-full bg-white rounded border border-gray-300 p-2" style={{ width: '300px', height: '80px' }}>
              <div className="text-xs font-medium text-gray-700 mb-1">ファイルパス：</div>
              <div className="h-14 overflow-y-auto">
                {droppedFiles.length === 0 ? (
                  <div className="text-gray-400 text-xs">ファイルがドロップされていません</div>
                ) : (
                  <div className="space-y-2">
                    {droppedFiles.map((file, index) => (
                      <div key={index} className="space-y-1">
                        {file.path.includes('\\') || file.path.includes('/') ? (
                          <div className="text-xs text-gray-700 break-all">{file.path}</div>
                        ) : (
                          <div className="text-xs font-medium text-gray-700">{file.name}</div>
                        )}
                        <div className="text-xs text-gray-400">
                          {formatFileSize(file.size)} • {file.type || '不明'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Buttons */}
      <div className="px-2 py-2 space-y-2">
        <button
          onClick={handleClose}
          className="w-full py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
        >
          閉じる
        </button>
        <button
          onClick={handleUpdate}
          disabled={!isLatestVersion}
          className={`w-full py-2 rounded transition-colors ${
            isLatestVersion 
              ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          更新
        </button>
      </div>

      {/* Message Area */}
      <div className="bg-white px-2 pb-1">
        <div className="bg-white px-2 py-1 h-5 overflow-hidden text-xs" style={{ 
          boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3), inset -1px -1px 2px rgba(255,255,255,0.8)',
          border: '1px inset #c0c0c0',
          borderStyle: 'inset'
        }}>
          {message ? (
            <div className="text-xs text-gray-700 leading-3 truncate">
              {message}
            </div>
          ) : (
            <div className="text-gray-400 text-xs leading-3">メッセージが表示されます</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealDetailWindow;