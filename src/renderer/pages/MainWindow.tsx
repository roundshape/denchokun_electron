import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MainWindow: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [periods, setPeriods] = useState<{name: string, fromDate: string, toDate: string}[]>([]);
  
  // 取引入力フォームの状態
  const [dealDate, setDealDate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [displayAmount, setDisplayAmount] = useState<string>('');
  const [partner, setPartner] = useState<string>('');
  const [dealName, setDealName] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [docType, setDocType] = useState<string>('領収書');
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [droppedFiles, setDroppedFiles] = useState<{name: string, path: string, size: number, type: string, preview?: string, fileObject?: File}[]>([]);
  const [messages, setMessages] = useState<string[]>([
    '[起動] アプリケーションが開始されました',
    '[初期化] 設定を読み込みました',
    '[準備完了] 取引データの入力が可能です'
  ]);
  const [apiServerUrl, setApiServerUrl] = useState<string>('http://localhost:8080');
  
  // オートコンプリート関連
  const [partnerHistory, setPartnerHistory] = useState<string[]>([]);
  const [partnerSuggestions, setPartnerSuggestions] = useState<string[]>([]);
  const [showPartnerSuggestions, setShowPartnerSuggestions] = useState<boolean>(false);
  
  const [dealNameHistory, setDealNameHistory] = useState<string[]>([]);
  const [dealNameSuggestions, setDealNameSuggestions] = useState<string[]>([]);
  const [showDealNameSuggestions, setShowDealNameSuggestions] = useState<boolean>(false);
  
  const [remarksHistory, setRemarksHistory] = useState<string[]>([]);
  const [remarksSuggestions, setRemarksSuggestions] = useState<string[]>([]);
  const [showRemarksSuggestions, setShowRemarksSuggestions] = useState<boolean>(false);

  useEffect(() => {
    const initializeApp = async () => {
      await loadApiServerUrl();
      await loadInputHistory();
      checkInitialSetup();
      await loadPeriods(); // メイン画面では起動時に期間データが必要
    };
    
    initializeApp();
  }, []);

  // 選択された期間が変更されたら保存
  useEffect(() => {
    const savePeriod = async () => {
      if (selectedPeriod && typeof window !== 'undefined' && window.electronAPI) {
        try {
          await window.electronAPI.store.set('selectedPeriod', selectedPeriod);
          console.log('取引期間を保存しました:', selectedPeriod);
        } catch (error) {
          console.error('取引期間の保存エラー:', error);
        }
      }
    };
    
    savePeriod();
  }, [selectedPeriod]);

  const loadInputHistory = async () => {
    try {
      // Electron環境でのみ実行
      if (typeof window !== 'undefined' && window.electronAPI) {
        const inputHistory = await window.electronAPI.store.get('inputHistory', {
          partners: [],
          dealNames: [],
          remarks: []
        });
        
        setPartnerHistory(inputHistory.partners || []);
        setDealNameHistory(inputHistory.dealNames || []);
        setRemarksHistory(inputHistory.remarks || []);
        
        const totalCount = (inputHistory.partners?.length || 0) + 
                          (inputHistory.dealNames?.length || 0) + 
                          (inputHistory.remarks?.length || 0);
        addMessage(`${totalCount}件の入力履歴を読み込みました`);
      }
    } catch (error) {
      console.error('入力履歴読み込みエラー:', error);
    }
  };

  const saveToHistory = async (type: 'partners' | 'dealNames' | 'remarks', value: string) => {
    if (!value.trim()) return;
    
    try {
      let currentHistory: string[] = [];
      let setHistory: (history: string[]) => void;
      
      switch (type) {
        case 'partners':
          currentHistory = partnerHistory;
          setHistory = setPartnerHistory;
          break;
        case 'dealNames':
          currentHistory = dealNameHistory;
          setHistory = setDealNameHistory;
          break;
        case 'remarks':
          currentHistory = remarksHistory;
          setHistory = setRemarksHistory;
          break;
      }
      
      // 重複を避けて履歴に追加
      const updatedHistory = [value, ...currentHistory.filter(item => item !== value)];
      // 最大30件まで保持
      const limitedHistory = updatedHistory.slice(0, 30);
      
      setHistory(limitedHistory);
      
      // Electron環境でのみ保存
      if (typeof window !== 'undefined' && window.electronAPI) {
        const allHistory = await window.electronAPI.store.get('inputHistory', {
          partners: [],
          dealNames: [],
          remarks: []
        });
        
        allHistory[type] = limitedHistory;
        await window.electronAPI.store.set('inputHistory', allHistory);
      }
    } catch (error) {
      console.error('履歴保存エラー:', error);
    }
  };

  const loadApiServerUrl = async () => {
    try {
      // Electron環境でのみ実行
      if (typeof window !== 'undefined' && window.electronAPI) {
        const settings = await window.electronAPI.store.get('settings');
        if (settings?.apiServer?.url) {
          setApiServerUrl(settings.apiServer.url);
        }
      }
    } catch (error) {
      console.error('APIサーバーURL読み込みエラー:', error);
    }
  };

  const checkInitialSetup = async () => {
    try {
      // Electron環境でのみ実行
      if (typeof window !== 'undefined' && window.electronAPI) {
      const settings = await window.electronAPI.store.get('settings');
      if (!settings?.baseFolder) {
        navigate('/setup');
        }
      }
    } catch (error) {
      console.error('設定確認エラー:', error);
    }
  };

  const loadPeriods = async () => {
    try {
      // APIから期間一覧を取得
      const result = await callAPI('/v1/api/periods', 'GET');
      
      
      if (result.success && result.periods && Array.isArray(result.periods)) {
        setPeriods(result.periods);
        
        // 前回保存された期間を復元
        let savedPeriod = '';
        if (typeof window !== 'undefined' && window.electronAPI) {
          try {
            savedPeriod = await window.electronAPI.store.get('selectedPeriod', '');
            console.log('保存されていた取引期間:', savedPeriod);
          } catch (error) {
            console.error('取引期間の読み込みエラー:', error);
          }
        }
        
        // 保存された期間が存在するかチェック
        const periodExists = savedPeriod && result.periods.some((p: any) => p.name === savedPeriod);
        
        if (periodExists) {
          // 保存された期間が存在する場合はそれを設定
          setSelectedPeriod(savedPeriod);
          addMessage(`${result.periods.length}個の期間を取得しました（前回の期間: ${savedPeriod}）`);
        } else if (result.periods.length > 0) {
          // 保存された期間がない、または存在しない場合は最初の期間を設定
          setSelectedPeriod(result.periods[0].name);
          addMessage(`${result.periods.length}個の期間を取得しました`);
        }
      } else {
        console.warn('期間データが取得できませんでした:', result);
        addMessage('期間データが取得できませんでした。APIサーバーの接続を確認してください。');
        // 期間データなしの状態を維持
        setPeriods([]);
        setSelectedPeriod('');
      }
    } catch (error) {
      console.error('期間読み込みエラー:', error);
      addMessage('期間データの読み込みでエラーが発生しました。APIサーバーの接続を確認してください。');
      // エラー時も期間データなしの状態を維持
      setPeriods([]);
      setSelectedPeriod('');
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    
    addMessage(`${files.length}個のファイルを処理中...`);
    
    const fileInfos = await Promise.all(files.map(async (file) => {
      try {
        console.log('Processing dropped file:', file.name, 'size:', file.size, 'type:', file.type);
        
        // 新しいセキュアな方法でファイルを処理
        if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.files) {
          const result = await window.electronAPI.files.processDroppedFile(file);
          
          if (result.success) {
            console.log('File processed successfully:', result.name);
            console.log('Real file path:', result.path);
            return {
              name: result.name,
              path: result.path, // 実際のファイルパス
              size: result.size,
              type: result.type,
              preview: result.preview,
              fileObject: file
            };
          } else {
            console.error('File processing failed:', result.error);
            // エラーの場合でもファイル情報は保持
            return {
              name: result.name,
              path: `[Error] ${result.name}`,
              size: result.size,
              type: result.type,
              preview: undefined,
              fileObject: file
            };
          }
        } else {
          // ブラウザ環境またはElectronAPIが利用できない場合のフォールバック
          console.log('Using fallback method for:', file.name);
          const objectUrl = URL.createObjectURL(file);
          return {
            name: file.name,
            path: `[Browser] ${file.name}`,
            size: file.size,
            type: file.type,
            preview: objectUrl,
            fileObject: file
          };
        }
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        return {
          name: file.name,
          path: `[Error] ${file.name}`,
          size: file.size,
          type: file.type,
          preview: undefined,
          fileObject: file
        };
      }
    }));
    
    setDroppedFiles(fileInfos);
    addMessage(`${files.length}個のファイルが処理されました`);
    console.log('Processed files:', fileInfos);
  };


  // ファイルタイプ推定
  const getFileType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'pdf':
        return 'application/pdf';
      case 'doc':
      case 'docx':
        return 'application/msword';
      case 'xls':
      case 'xlsx':
        return 'application/vnd.ms-excel';
      case 'txt':
        return 'text/plain';
      case 'zip':
        return 'application/zip';
      default:
        return 'application/octet-stream';
    }
  };

  // ファイルアイコン生成
  const getFileIcon = (fileType: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    // 拡張子に応じてアイコンを返す
    switch (ext) {
      case 'pdf':
        return (
          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">PDF</span>
          </div>
        );
      case 'doc':
      case 'docx':
        return (
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">DOC</span>
          </div>
        );
      case 'xls':
      case 'xlsx':
        return (
          <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">XLS</span>
          </div>
        );
      case 'txt':
        return (
          <div className="w-8 h-8 bg-gray-500 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">TXT</span>
          </div>
        );
      case 'zip':
      case 'rar':
        return (
          <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">ZIP</span>
          </div>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return (
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">IMG</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-400 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">FILE</span>
          </div>
        );
    }
  };

  // ファイルアップロード用データ処理
  const processFileForUpload = async (file: {name: string, path: string, size: number, type: string, preview?: string, fileObject?: File}) => {
    try {
      const maxSizeForBase64 = 10 * 1024 * 1024; // 10MB
      
      // APIリクエスト用のファイル名生成（取引NOはサーバー側で生成）
      const timestamp = Date.now();
      const apiFileName = `${dealDate}_${partner}_${amount}_${timestamp}.${file.name.split('.').pop()}`;
      
      if (file.size >= maxSizeForBase64) {
        // 10MB以上の場合：別途ファイルアップロードAPI使用
        addMessage(`大きなファイル(${(file.size / 1024 / 1024).toFixed(1)}MB)を別途アップロード中...`);
        
        if (typeof window !== 'undefined' && window.electronAPI) {
          try {
            // 大きなファイル用のアップロードAPI
            const uploadResult = await callAPI('/v1/api/files', 'POST', {
              fileName: apiFileName,
              originalName: file.name,
              filePath: file.path,
              size: file.size,
              type: file.type
            });
            
            const fileId = uploadResult.fileId || uploadResult.id;
            addMessage(`ファイルアップロード完了 (ID: ${fileId})`);
            
            return {
              name: file.name,
              path: apiFileName,
              size: file.size,
              fileId: fileId
            };
          } catch (error) {
            console.error('大容量ファイルアップロードエラー:', error);
            throw new Error('ファイルアップロードに失敗しました');
          }
        }
      } else {
        // 10MB未満の場合：ファイル情報のみ送信（WinShellPreview使用）
        return {
          name: file.name,
          path: apiFileName,
          size: file.size
        };
      }
    } catch (error) {
      console.error('ファイル処理エラー:', error);
      return null;
    }
  };

  // API通信関数
  const callAPI = async (endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any, isMultipart: boolean = false) => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        // Electron環境：IPCを使用
        const result = await window.electronAPI.api.request({
          server: 'denchokun',
          endpoint,
          method,
          data,
          isMultipart
        });
        return result;
      } else {
        // ブラウザ環境：直接fetch
        let body: any;
        let headers: Record<string, string> = {};

        if (isMultipart && data) {
          // multipart/form-dataの場合
          const formData = new FormData();
          
          // dealDataをJSON文字列として追加
          if (data.dealData) {
            formData.append('dealData', JSON.stringify(data.dealData));
          }
          
          // ファイルを追加
          if (data.file && data.file.fileObject) {
            formData.append('file', data.file.fileObject);
          }
          
          body = formData;
          // Content-Typeヘッダーは自動設定されるため、明示的に設定しない
        } else {
          // 通常のJSONリクエスト
          headers['Content-Type'] = 'application/json';
          body = data ? JSON.stringify(data) : undefined;
        }

        const response = await fetch(`${apiServerUrl}${endpoint}`, {
          method,
          headers,
          body
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
    } catch (error) {
      console.error('API通信エラー:', error);
      throw error;
    }
  };

  const addMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const timestampedMessage = `[${timestamp}] ${message}`;
    setMessages(prev => [...prev, timestampedMessage]);
  };


  // 金額フォーマット関数
  const formatAmount = (value: string): string => {
    // 数字以外を除去
    const numericValue = value.replace(/[^\d]/g, '');
    if (numericValue === '') return '';
    
    // 数値に変換してカンマ区切りで表示
    const number = parseInt(numericValue);
    return number.toLocaleString('ja-JP');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // 数字以外を除去して実際の値として保存
    const numericValue = inputValue.replace(/[^\d]/g, '');
    setAmount(numericValue);
    // 表示用にカンマ区切りで設定
    setDisplayAmount(formatAmount(numericValue));
  };

  const handlePartnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setPartner(inputValue);
    
    // 1文字以上入力されている場合、候補を表示
    if (inputValue.length > 0) {
      const suggestions = partnerHistory.filter(p => 
        p.toLowerCase().includes(inputValue.toLowerCase())
      );
      setPartnerSuggestions(suggestions);
      setShowPartnerSuggestions(suggestions.length > 0);
    } else {
      setShowPartnerSuggestions(false);
    }
  };

  const handlePartnerSelect = (selectedPartner: string) => {
    setPartner(selectedPartner);
    setShowPartnerSuggestions(false);
  };

  const handlePartnerBlur = () => {
    // 少し遅延させてクリックイベントを処理できるようにする
    setTimeout(() => {
      setShowPartnerSuggestions(false);
    }, 200);
  };

  // 取引名のオートコンプリート
  const handleDealNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDealName(inputValue);
    
    if (inputValue.length > 0) {
      const suggestions = dealNameHistory.filter(name => 
        name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setDealNameSuggestions(suggestions);
      setShowDealNameSuggestions(suggestions.length > 0);
    } else {
      setShowDealNameSuggestions(false);
    }
  };

  const handleDealNameSelect = (selectedDealName: string) => {
    setDealName(selectedDealName);
    setShowDealNameSuggestions(false);
  };

  const handleDealNameBlur = () => {
    setTimeout(() => {
      setShowDealNameSuggestions(false);
    }, 200);
  };

  // 備考のオートコンプリート
  const handleRemarksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setRemarks(inputValue);
    
    if (inputValue.length > 0) {
      const suggestions = remarksHistory.filter(remark => 
        remark.toLowerCase().includes(inputValue.toLowerCase())
      );
      setRemarksSuggestions(suggestions);
      setShowRemarksSuggestions(suggestions.length > 0);
    } else {
      setShowRemarksSuggestions(false);
    }
  };

  const handleRemarksSelect = (selectedRemark: string) => {
    setRemarks(selectedRemark);
    setShowRemarksSuggestions(false);
  };

  const handleRemarksBlur = () => {
    setTimeout(() => {
      setShowRemarksSuggestions(false);
    }, 200);
  };

  const handleReset = () => {
    setDealDate('');
    setAmount('');
    setDisplayAmount('');
    setPartner('');
    setDealName('');
    setRemarks('');
    setDocType('領収書');
    setDroppedFiles([]);
    addMessage('フォームがリセットされました');
  };

  const handleSubmit = async () => {
    // バリデーション（必須項目：取引日、金額、取引先）
    if (!dealDate || !amount || !partner) {
      addMessage('入力エラー: 必須項目（取引日、金額、取引先）を入力してください');
      // Electron環境でのみダイアログ表示
      if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: '入力エラー',
        message: '必須項目（取引日、金額、取引先）を入力してください。',
        buttons: ['OK']
      });
      } else {
        alert('必須項目を入力してください。');
      }
      return;
    }

    // 取引日が期間の範囲内かチェック
    const selectedPeriodData = periods.find(p => p.name === selectedPeriod);
    if (selectedPeriodData) {
      const fromDate = selectedPeriodData.fromDate;
      const toDate = selectedPeriodData.toDate;
      
      // 開始日チェック（開始日が指定されている場合）
      if (fromDate && fromDate !== '未設定' && dealDate < fromDate) {
        addMessage(`取引日は期間の開始日（${fromDate}）以降である必要があります`);
        if (typeof window !== 'undefined' && window.electronAPI) {
          await window.electronAPI.showMessageBox({
            type: 'warning',
            title: '入力エラー',
            message: `取引日は期間の開始日（${fromDate}）以降である必要があります。`,
            buttons: ['OK']
          });
        } else {
          alert(`取引日は期間の開始日（${fromDate}）以降である必要があります。`);
        }
        return;
      }
      
      // 終了日チェック（終了日が指定されている場合）
      if (toDate && toDate !== '未設定' && dealDate > toDate) {
        addMessage(`取引日は期間の終了日（${toDate}）以前である必要があります`);
        if (typeof window !== 'undefined' && window.electronAPI) {
          await window.electronAPI.showMessageBox({
            type: 'warning',
            title: '入力エラー',
            message: `取引日は期間の終了日（${toDate}）以前である必要があります。`,
            buttons: ['OK']
          });
        } else {
          alert(`取引日は期間の終了日（${toDate}）以前である必要があります。`);
        }
        return;
      }
    }

    try {
      // multipart/form-data形式で取引データを送信
      const dealData = {
        period: selectedPeriod,
        DealType: docType,
        DealDate: dealDate,
        DealName: dealName,
        DealPartner: partner,
        DealPrice: parseFloat(amount),
        DealRemark: remarks,
        RecStatus: "NEW"
      };

      // ファイルデータの準備
      let fileInfo = null;
      if (droppedFiles.length > 0) {
        const droppedFile = droppedFiles[0];
        // ファイルオブジェクトまたはパス情報を使用
        fileInfo = {
          path: droppedFile.path,
          name: droppedFile.name,
          type: droppedFile.type,
          size: droppedFile.size,
          fileObject: droppedFile.fileObject // ブラウザ環境用
        };
      }

      console.log('取引データを送信:', { dealData, file: fileInfo });
      addMessage('APIサーバーに取引データを送信中...');

      // API呼び出し（multipart/form-data形式）
      const result = await callAPI('/v1/api/deals', 'POST', {
        dealData,
        file: fileInfo
      }, true); // 第4引数にtrue（multipart）を指定
      
      console.log('API応答:', result);
      
      if (result.success) {
        addMessage(`取引データを登録しました (ID: ${result.dealId}, 金額: ¥${displayAmount})`);
        if (result.filePath) {
          addMessage(`ファイルも正常にアップロードされました: ${result.filePath}`);
        }
      } else {
        throw new Error(result.message || '登録に失敗しました');
      }
      
      // 入力内容を履歴に保存
      await saveToHistory('partners', partner);
      await saveToHistory('dealNames', dealName);
      if (remarks.trim()) {
        await saveToHistory('remarks', remarks);
      }
      
      // Electron環境でのみダイアログ表示
      if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.showMessageBox({
        type: 'info',
        title: '登録完了',
        message: '取引が正常に登録されました。',
        buttons: ['OK']
      });
      } else {
        alert('取引が正常に登録されました。');
      }

      // 登録成功後もフォームの内容を保持（リセットしない）
    } catch (error) {
      console.error('保存エラー:', error);
      addMessage('登録エラー: 取引データの登録に失敗しました');
      // Electron環境でのみダイアログ表示
      if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'エラー',
        message: '取引の保存に失敗しました。',
        buttons: ['OK']
      });
      } else {
        alert('取引の保存に失敗しました。');
      }
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
              <span className="text-sm font-mono">{apiServerUrl}</span>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 mr-4">
            <span className="text-sm text-gray-700">取引期間：</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
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
          <button 
            onClick={async () => {
              if (typeof window !== 'undefined' && window.electronAPI) {
                if (!selectedPeriod) {
                  await window.electronAPI.showMessageBox({
                    type: 'warning',
                    title: '期間未選択',
                    message: '期間を選択してください。',
                    buttons: ['OK']
                  });
                  return;
                }
                await window.electronAPI.openDealPeriodSearch(selectedPeriod);
              }
            }}
            className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            期間表示
          </button>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex-1 px-2 py-1 flex flex-col">
        <div className="flex gap-2" style={{ height: 'calc(100% - 30px)' }}>
          {/* Left Column - Input Form */}
          <div className="flex-1 space-y-1">
            {/* Deal Date and Type */}
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

            {/* Amount */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">金額：</label>
              <div className="flex items-center">
                <span className="text-sm text-gray-700 mr-2">¥</span>
                <input
                  type="text"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Partner */}
            <div className="relative">
              <label className="block text-sm text-gray-700 mb-1">取引先：</label>
              <input
                type="text"
                value={partner}
                onChange={handlePartnerChange}
                onBlur={handlePartnerBlur}
                onFocus={() => {
                  if (partner.length > 0) {
                    const suggestions = partnerHistory.filter(p => 
                      p.toLowerCase().includes(partner.toLowerCase())
                    );
                    setPartnerSuggestions(suggestions);
                    setShowPartnerSuggestions(suggestions.length > 0);
                  }
                }}
                className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="取引先名を入力..."
                autoComplete="off"
              />
              
              {/* オートコンプリート候補 */}
              {showPartnerSuggestions && partnerSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                  {partnerSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handlePartnerSelect(suggestion)}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Deal Name */}
            <div className="relative">
              <label className="block text-sm text-gray-700 mb-1">取引名：</label>
              <input
                type="text"
                value={dealName}
                onChange={handleDealNameChange}
                onBlur={handleDealNameBlur}
                onFocus={() => {
                  if (dealName.length > 0) {
                    const suggestions = dealNameHistory.filter(name => 
                      name.toLowerCase().includes(dealName.toLowerCase())
                    );
                    setDealNameSuggestions(suggestions);
                    setShowDealNameSuggestions(suggestions.length > 0);
                  }
                }}
                className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="取引内容を入力..."
                autoComplete="off"
              />
              
              {/* オートコンプリート候補 */}
              {showDealNameSuggestions && dealNameSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                  {dealNameSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleDealNameSelect(suggestion)}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Remarks */}
            <div className="relative">
              <label className="block text-sm text-gray-700 mb-1">備考：</label>
              <input
                type="text"
                value={remarks}
                onChange={handleRemarksChange}
                onBlur={handleRemarksBlur}
                onFocus={() => {
                  if (remarks.length > 0) {
                    const suggestions = remarksHistory.filter(remark => 
                      remark.toLowerCase().includes(remarks.toLowerCase())
                    );
                    setRemarksSuggestions(suggestions);
                    setShowRemarksSuggestions(suggestions.length > 0);
                  }
                }}
                className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="備考を入力..."
                autoComplete="off"
              />
              
              {/* オートコンプリート候補 */}
              {showRemarksSuggestions && remarksSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                  {remarksSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleRemarksSelect(suggestion)}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                    >
                      {suggestion}
                    </div>
                  ))}
              </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-2 space-y-2">
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
                    <p className="text-lg font-medium text-gray-700 mb-2">📁 ファイルをドラッグ&ドロップ</p>
                    <p className="text-sm text-gray-500 mb-3">複数ファイル対応</p>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>✓ PDF, 画像 (JPG, PNG, GIF)</p>
                      <p>✓ Office文書 (Word, Excel, PowerPoint)</p>
                      <p>✓ 動画, その他のファイル</p>
                    </div>
                  </div>
                </div>
              ) : droppedFiles.length === 1 ? (
                // ファイル1つの場合、プレビューまたはアイコン表示
                droppedFiles[0].preview ? (
                  // WinShellPreviewによるプレビュー表示
                  <div className="w-full h-full relative">
                    <img 
                      src={droppedFiles[0].preview} 
                      alt={droppedFiles[0].name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  // デフォルトアイコン表示
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                    <div className="flex flex-col items-center space-y-2">
                      {getFileIcon(droppedFiles[0].type, droppedFiles[0].name)}
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-700 max-w-[200px] truncate">
                          {droppedFiles[0].name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(droppedFiles[0].size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // 複数ファイルまたは非画像ファイルの場合、ファイル情報表示
                <div className="p-3 h-full overflow-y-auto">
                  <div className="space-y-2">
                    {droppedFiles.map((file, index) => (
                      <div key={index} className="bg-white rounded p-2 border border-gray-200 flex items-center space-x-2">
                        {/* ファイルアイコン */}
                        <div className="flex-shrink-0">
                          {getFileIcon(file.type, file.name)}
                        </div>
                        {/* ファイル情報 */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-700 truncate">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* File List */}
            <div className="mt-4" style={{ width: '300px' }}>
              <div className="bg-gray-50 border border-gray-300 rounded p-3 min-h-[80px] max-h-[150px] overflow-y-auto">
                {droppedFiles.length === 0 ? (
                  <div className="text-gray-400 text-xs">ファイルがドロップされていません</div>
                ) : (
                  <div className="space-y-2">
                    {droppedFiles.map((file, index) => (
                      <div key={index} className="space-y-1">
                        {/* フルパスがある場合はパスのみ、ない場合はファイル名のみ表示 */}
                        {file.path.includes('\\') || file.path.includes('/') ? (
                          // フルパスの場合（ファイル選択時）
                          <div className="text-xs text-gray-700 break-all">{file.path}</div>
                        ) : file.path.startsWith('[') ? (
                          // ドラッグ&ドロップ時（制限表示）
                          <div className="text-xs font-medium text-gray-700">{file.name}</div>
                        ) : (
                          // その他の場合
                          <div className="text-xs font-medium text-gray-700">{file.name}</div>
                        )}
                        <div className="text-xs text-gray-400">
                          {file.size > 0 ? `${(file.size / 1024).toFixed(1)} KB` : 'サイズ不明'} • {file.type || '不明'}
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

      {/* Message Area */}
      <div className="bg-white px-2 pb-1">
        <div className="bg-white px-2 py-1 h-5 overflow-hidden text-xs" style={{ 
          boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3), inset -1px -1px 2px rgba(255,255,255,0.8)',
          border: '1px inset #c0c0c0',
          borderStyle: 'inset'
        }}>
          {messages.length === 0 ? (
            <div className="text-gray-400 text-xs leading-3">メッセージが表示されます</div>
          ) : (
            <div className="text-xs text-gray-700 leading-3 truncate">
              {messages[messages.length - 1]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainWindow;