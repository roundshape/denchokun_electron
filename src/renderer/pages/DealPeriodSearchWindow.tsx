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
  // 履歴表示用
  baseNO?: string;
  nextNO?: string | null;
  prevNO?: string | null;
  children?: Deal[];
  childCount?: number;
  hasChildren?: boolean;
}

interface DealPeriod {
  name: string;
  fromDate: string;
  toDate: string;
}

const DealPeriodSearchWindow: React.FC = () => {
  const [periods, setPeriods] = useState<DealPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // フィルター条件
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterPartner, setFilterPartner] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set()); // 展開されている取引のNOを管理

  useEffect(() => {
    // URLパラメータから期間名を取得
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const periodFromUrl = urlParams.get('period');
    
    // ウィンドウタイトルを設定
    if (periodFromUrl) {
      document.title = `期間検索 - ${periodFromUrl} - 電帳君`;
    } else {
      document.title = '期間検索 - 電帳君';
    }
    
    loadPeriods(periodFromUrl || undefined);
  }, []);

  useEffect(() => {
    // 取引更新通知を受信
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onDealUpdated(() => {
        console.log('Deal updated notification received, refreshing...');
        // 最後の検索条件で再検索
        handleSearch();
      });
      
      return () => {
        if (window.electronAPI) {
          window.electronAPI.removeDealUpdatedListener();
        }
      };
    }
  }, [selectedPeriod, filterDateFrom, filterDateTo, filterPartner, showHistory]);

  useEffect(() => {
    // メニューイベントを受信
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onMenuAction((action: string) => {
        if (action === 'menu-expand-all') {
          handleExpandAll();
        } else if (action === 'menu-collapse-all') {
          handleCollapseAll();
        }
      });
      
      return () => {
        if (window.electronAPI) {
          window.electronAPI.removeMenuListeners();
        }
      };
    }
  }, [filteredDeals]);

  useEffect(() => {
    // 履歴表示チェックボックスが変更されたら、検索結果がある場合は自動的に再検索
    if (filteredDeals.length > 0) {
      handleSearch();
    }
  }, [showHistory]);

  // ドラッグ&ドロップのデフォルト動作を防ぐ
  // この画面にはドロップエリアが存在しないため、ファイルをドラッグした際に
  // ブラウザのデフォルト動作（ファイルを開く、ナビゲーション等）が発生しないようにする。
  // 特に、この画面から開かれたモーダルウィンドウ（更新画面）でドラッグ操作をしている時に、
  // この親ウィンドウが意図せず前面に表示されることを防ぐために重要。
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
    };

    // キャプチャフェーズで処理することで、デフォルト動作を防ぐ
    document.addEventListener('dragover', preventDefaults, true);
    document.addEventListener('drop', preventDefaults, true);

    return () => {
      document.removeEventListener('dragover', preventDefaults, true);
      document.removeEventListener('drop', preventDefaults, true);
    };
  }, []);

  // 期間選択時の自動読み込みは不要（検索ボタンで実行）

  // API通信関数
  const callAPI = async (endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any) => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.api.request({
          server: 'denchokun',
          endpoint,
          method,
          data
        });
        return result;
      }
    } catch (error) {
      console.error('API通信エラー:', error);
      throw error;
    }
  };

  const loadPeriods = async (initialPeriod?: string) => {
    try {
      const result = await callAPI('/v1/api/periods', 'GET');
      if (result.success && result.periods && Array.isArray(result.periods)) {
        setPeriods(result.periods);
        
        // 初期期間が指定されている場合はそれを選択、なければ最初の期間を選択
        let selectedPeriodData: DealPeriod | undefined;
        if (initialPeriod && result.periods.some((p: DealPeriod) => p.name === initialPeriod)) {
          setSelectedPeriod(initialPeriod);
          selectedPeriodData = result.periods.find((p: DealPeriod) => p.name === initialPeriod);
          console.log(`Initial period set to: ${initialPeriod}`);
        } else if (result.periods.length > 0) {
          setSelectedPeriod(result.periods[0].name);
          selectedPeriodData = result.periods[0];
        }
        
        // 期間のfromDateとtoDateを日付フィルターの初期値に設定
        if (selectedPeriodData) {
          if (selectedPeriodData.fromDate && selectedPeriodData.fromDate !== '未設定') {
            setFilterDateFrom(selectedPeriodData.fromDate);
          } else {
            setFilterDateFrom('');
          }
          if (selectedPeriodData.toDate && selectedPeriodData.toDate !== '未設定') {
            setFilterDateTo(selectedPeriodData.toDate);
          } else {
            setFilterDateTo('');
          }
        }
      } else {
        console.warn('期間データが取得できませんでした:', result);
        setPeriods([]);
      }
    } catch (error) {
      console.error('期間読み込みエラー:', error);
      setPeriods([]);
    }
  };

  const loadDeals = async (periodName: string) => {
    setLoading(true);
    try {
      // 選択された期間のfromDateとtoDateを取得
      const selectedPeriodData = periods.find(p => p.name === periodName);
      
      // クエリパラメータを構築
      const params = new URLSearchParams();
      params.append('period', periodName);
      
      if (selectedPeriodData) {
        if (selectedPeriodData.fromDate && 
            selectedPeriodData.fromDate.trim() !== '' && 
            selectedPeriodData.fromDate !== '未設定') {
          params.append('from_date', selectedPeriodData.fromDate);
        }
        if (selectedPeriodData.toDate && 
            selectedPeriodData.toDate.trim() !== '' && 
            selectedPeriodData.toDate !== '未設定') {
          params.append('to_date', selectedPeriodData.toDate);
        }
      }
      
      const result = await callAPI(`/v1/api/deals?${params.toString()}`, 'GET');
      if (result.success && result.deals && Array.isArray(result.deals)) {
        setDeals(result.deals);
        // 初期読み込み時はフィルタリングされたデータをクリア
        setFilteredDeals([]);
      } else {
        console.warn('取引データが取得できませんでした:', result);
        setDeals([]);
        setFilteredDeals([]);
      }
    } catch (error) {
      console.error('取引読み込みエラー:', error);
      setDeals([]);
      setFilteredDeals([]);
      if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'エラー',
          message: '取引データの取得に失敗しました。',
          buttons: ['OK']
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...deals];

    // 日付フィルター
    if (filterDateFrom) {
      filtered = filtered.filter(deal => deal.DealDate >= filterDateFrom);
    }
    if (filterDateTo) {
      filtered = filtered.filter(deal => deal.DealDate <= filterDateTo);
    }

    // 取引先フィルター
    if (filterPartner) {
      filtered = filtered.filter(deal => 
        deal.DealPartner.toLowerCase().includes(filterPartner.toLowerCase())
      );
    }

    setFilteredDeals(filtered);
  };

  const handleClearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterPartner('');
    setFilteredDeals([]);
  };

  const handleClearSearchWord = () => {
    setFilterPartner('');
  };

  const handleExpandAll = () => {
    // 全ての取引を展開
    const allDealNOs = new Set<string>();
    filteredDeals.forEach(deal => {
      if (deal.hasChildren) {
        allDealNOs.add(deal.NO);
      }
    });
    setExpandedDeals(allDealNOs);
  };

  const handleCollapseAll = () => {
    // 全ての取引を折りたたむ
    setExpandedDeals(new Set());
  };

  const handleSearch = async () => {
    // 検索ボタンクリック時にAPIを呼び出す
    if (!selectedPeriod) {
      setFilteredDeals([]);
      return;
    }
    
    setLoading(true);
    try {
      // クエリパラメータを構築
      const params = new URLSearchParams();
      params.append('period', selectedPeriod);
      
      // 取引日（開始）
      if (filterDateFrom && filterDateFrom.trim() !== '') {
        params.append('from_date', filterDateFrom);
      }
      
      // 取引日（終了）
      if (filterDateTo && filterDateTo.trim() !== '') {
        params.append('to_date', filterDateTo);
      }
      
      // 検索ワード
      if (filterPartner && filterPartner.trim() !== '') {
        params.append('keyword', filterPartner);
      }
      
      // 履歴表示
      if (showHistory) {
        params.append('view', 'history');
      }
      
      const result = await callAPI(`/v1/api/deals?${params.toString()}`, 'GET');
      console.log('API Response:', result);
      console.log('Deals:', result.deals);
      if (result.deals && result.deals.length > 0) {
        console.log('First deal:', result.deals[0]);
        console.log('Has children?', result.deals[0].children);
        console.log('childCount:', result.deals[0].childCount);
      }
      
      if (result.success && result.deals && Array.isArray(result.deals)) {
        setFilteredDeals(result.deals);
      } else {
        console.warn('取引データが取得できませんでした:', result);
        setFilteredDeals([]);
      }
    } catch (error) {
      console.error('検索エラー:', error);
      setFilteredDeals([]);
      if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'エラー',
          message: '検索に失敗しました。',
          buttons: ['OK']
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('ja-JP');
  };

  const toggleExpand = (dealNO: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 行クリックイベントを防ぐ
    setExpandedDeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dealNO)) {
        newSet.delete(dealNO);
      } else {
        newSet.add(dealNO);
      }
      return newSet;
    });
  };

  const handleRowClick = async (deal: Deal) => {
    console.log('Row clicked, deal data:', deal);
    console.log('NO:', deal.NO);
    if (typeof window !== 'undefined' && window.electronAPI) {
      // 取引データに期間情報を追加
      const dealWithPeriod = {
        ...deal,
        _period: selectedPeriod
      };
      await window.electronAPI.openDealDetail(dealWithPeriod);
    }
  };

  const getTotalAmount = (): number => {
    return filteredDeals.reduce((sum, deal) => sum + deal.DealPrice, 0);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Filter Panel */}
      <div className="bg-white px-6 py-4 border-b">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 日付フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">取引日（開始）</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">取引日（終了）</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filterPartner}
              onChange={(e) => setFilterPartner(e.target.value)}
              placeholder="検索ワードを入力してください"
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleClearSearchWord}
              className="px-3 py-2 border border-gray-300 bg-white rounded hover:bg-gray-100 transition-colors"
              title="入力欄をクリア"
            >
              X
            </button>
            <label className="flex items-center gap-1 whitespace-nowrap">
              <input
                type="checkbox"
                checked={showHistory}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setShowHistory(newValue);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">履歴表示</span>
            </label>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              検索
            </button>
          </div>
        </div>
      </div>

      {/* Deal List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : filteredDeals.length === 0 && deals.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">取引データがありません</div>
          </div>
        ) : filteredDeals.length === 0 && deals.length > 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">検索条件を入力して検索ボタンを押してください</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    取引日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    取引先
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    種別
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    取引名
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDeals.map((deal) => (
                  <React.Fragment key={deal.NO}>
                    {/* 最新版の行 */}
                    <tr
                      onDoubleClick={() => handleRowClick(deal)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${deal.RecStatus === 'DELETE' ? 'italic' : ''}`}>
                        <div className="flex items-center gap-2">
                          {deal.children && deal.children.length > 0 && (
                            <button
                              onClick={(e) => toggleExpand(deal.NO, e)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              {expandedDeals.has(deal.NO) ? '▼' : '▶'}
                            </button>
                          )}
                          {deal.DealDate}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${deal.RecStatus === 'DELETE' ? 'italic' : ''}`}>
                        {deal.DealPartner}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right ${deal.RecStatus === 'DELETE' ? 'italic' : ''}`}>
                        ¥{formatAmount(deal.DealPrice)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${deal.RecStatus === 'DELETE' ? 'italic' : ''}`}>
                        {deal.DealType}
                      </td>
                      <td className={`px-6 py-4 text-sm text-gray-900 ${deal.RecStatus === 'DELETE' ? 'italic' : ''}`}>
                        {deal.DealName}
                      </td>
                    </tr>
                    
                    {/* 履歴行（展開時のみ表示） */}
                    {expandedDeals.has(deal.NO) && deal.children && deal.children.map((childDeal) => (
                      <tr
                        key={childDeal.NO}
                        onDoubleClick={() => handleRowClick(childDeal)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors bg-gray-50"
                      >
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${childDeal.RecStatus === 'DELETE' ? 'italic' : ''}`}>
                          <div className="flex items-center gap-2 pl-8">
                            ↳ {childDeal.DealDate}
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${childDeal.RecStatus === 'DELETE' ? 'italic' : ''}`}>
                          {childDeal.DealPartner}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right ${childDeal.RecStatus === 'DELETE' ? 'italic' : ''}`}>
                          ¥{formatAmount(childDeal.DealPrice)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${childDeal.RecStatus === 'DELETE' ? 'italic' : ''}`}>
                          {childDeal.DealType}
                        </td>
                        <td className={`px-6 py-4 text-sm text-gray-600 ${childDeal.RecStatus === 'DELETE' ? 'italic' : ''}`}>
                          {childDeal.DealName}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealPeriodSearchWindow;

