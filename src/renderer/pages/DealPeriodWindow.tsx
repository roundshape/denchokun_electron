import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface DealPeriod {
  name: string;
  fromDate: string;
  toDate: string;
  created?: string;
  updated?: string;
}

const DealPeriodWindow: React.FC = () => {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<DealPeriod[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<DealPeriod | null>(null);
  const [formData, setFormData] = useState<DealPeriod>({
    name: '',
    fromDate: '',
    toDate: ''
  });

  useEffect(() => {
    // 期間管理画面を開いた時は最新データを取得
    loadPeriods();
  }, []);

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

  const loadPeriods = async () => {
    try {
      const result = await callAPI('/v1/api/periods', 'GET');
      if (result.success && result.periods && Array.isArray(result.periods)) {
        setPeriods(result.periods);
      } else {
        console.warn('期間データが取得できませんでした:', result);
        setPeriods([]);
      }
    } catch (error) {
      console.error('期間読み込みエラー:', error);
      setPeriods([]);
    }
  };

  const handleNewPeriod = () => {
    setEditingPeriod(null);
    setFormData({
      name: '',
      fromDate: '',
      toDate: ''
    });
    setShowForm(true);
  };

  const handleEditPeriod = (period: DealPeriod) => {
    setEditingPeriod(period);
    setFormData({
      name: period.name,
      fromDate: period.fromDate === '未設定' ? '' : period.fromDate,
      toDate: period.toDate === '未設定' ? '' : period.toDate
    });
    setShowForm(true);
  };

  const handleDeletePeriod = async (period: DealPeriod) => {
    const result = await window.electronAPI.showMessageBox({
      type: 'question',
      title: '削除確認',
      message: `期間「${period.name}」を削除しますか？\n\n注意：\n・取引データが存在する期間は削除できません\n・削除すると期間フォルダごと完全に削除されます`,
      buttons: ['キャンセル', '削除'],
      defaultId: 0,
      cancelId: 0
    });

    if (result.response === 1) {
      try {
        const deleteResult = await callAPI(`/v1/api/periods?period=${encodeURIComponent(period.name)}`, 'DELETE');
        if (deleteResult.success) {
          await window.electronAPI.showMessageBox({
            type: 'info',
            title: '削除完了',
            message: '期間を削除しました。',
            buttons: ['OK']
          });
          loadPeriods();
        } else {
          // APIのエラータイプに応じて適切なメッセージを表示
          let errorMessage = '期間の削除に失敗しました。';
          let errorTitle = 'エラー';
          
          if (deleteResult.error === 'period_has_deals') {
            errorTitle = '削除できません';
            errorMessage = `期間「${period.name}」には取引データが存在するため削除できません。\n先に取引データを削除するか、別の期間に移動してください。`;
          } else if (deleteResult.error === 'period_not_found') {
            errorTitle = '期間が見つかりません';
            errorMessage = `期間「${period.name}」が見つかりません。\n既に削除されている可能性があります。`;
          } else {
            errorMessage = deleteResult.message || '期間の削除に失敗しました。';
          }
          
          await window.electronAPI.showMessageBox({
            type: 'warning',
            title: errorTitle,
            message: errorMessage,
            buttons: ['OK']
          });
          
          // 期間が見つからない場合は一覧を更新
          if (deleteResult.error === 'period_not_found') {
            loadPeriods();
          }
        }
      } catch (error) {
        console.error('Failed to delete period:', error);
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'エラー',
          message: '期間の削除でエラーが発生しました。\nサーバーとの通信を確認してください。',
          buttons: ['OK']
        });
      }
    }
  };

  const handleSavePeriod = async () => {
    if (!formData.name) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: '入力エラー',
        message: '期間名を入力してください。',
        buttons: ['OK']
      });
      return;
    }

    // 開始日・終了日の両方が入力されている場合のみ日付順序をチェック
    if (formData.fromDate && formData.toDate && formData.fromDate > formData.toDate) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: '入力エラー',
        message: '終了日は開始日より後の日付を指定してください。',
        buttons: ['OK']
      });
      return;
    }

    try {
      // 空の日付は「未設定」として送信
      const requestData = {
        name: formData.name,
        fromDate: formData.fromDate || '未設定',
        toDate: formData.toDate || '未設定'
      };

      let result;
      if (editingPeriod) {
        // 編集の場合：名前が変更されているかチェック
        if (editingPeriod.name !== formData.name) {
          // 期間名を変更する場合
          result = await callAPI('/v1/api/periods/name', 'PUT', {
            oldName: editingPeriod.name,
            newName: formData.name
          });
          
          if (!result.success) {
            throw new Error(result.message || '期間名の変更に失敗しました');
          }
        }
        
        // 日付を更新する場合（期間名変更後は新しい名前を使用）
        result = await callAPI(`/v1/api/periods/dates?period=${encodeURIComponent(formData.name)}`, 'PUT', {
          fromDate: requestData.fromDate,
          toDate: requestData.toDate
        });
      } else {
        // 新規作成の場合（POST）
        result = await callAPI('/v1/api/periods', 'POST', requestData);
      }

      if (result.success) {
        await window.electronAPI.showMessageBox({
          type: 'info',
          title: '保存完了',
          message: editingPeriod ? '期間を更新しました。' : '期間を作成しました。',
          buttons: ['OK']
        });
        setShowForm(false);
        loadPeriods();
      } else {
        throw new Error(result.message || '保存に失敗しました');
      }
    } catch (error) {
      console.error('Failed to save period:', error);
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'エラー',
        message: `期間の保存に失敗しました。\n${error instanceof Error ? error.message : '不明なエラー'}`,
        buttons: ['OK']
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">取引期間管理</h1>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              戻る
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white px-6 py-3 border-b">
        <button onClick={handleNewPeriod} className="btn-primary">
          新規期間作成
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {showForm ? (
          <div className="card max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingPeriod ? '期間編集' : '新規期間作成'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="form-label">期間名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  placeholder="例: 2024年度"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">開始日 <span className="text-sm text-gray-500">(省略可能)</span></label>
                  <input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                    className="form-input"
                    title="未入力の場合は「未設定」として保存されます"
                  />
                </div>
                <div>
                  <label className="form-label">終了日 <span className="text-sm text-gray-500">(省略可能)</span></label>
                  <input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                    className="form-input"
                    title="未入力の場合は「未設定」として保存されます"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSavePeriod}
                  className="btn-primary"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {periods.length === 0 ? (
              <div className="card text-center text-gray-500">
                <p>期間が登録されていません。</p>
              </div>
            ) : (
              periods.map(period => (
                <div key={period.name} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{period.name}</h3>
                      <p className="text-sm text-gray-600">
                        {period.fromDate || '未設定'} ～ {period.toDate || '未設定'}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditPeriod(period)}
                        className="btn-secondary"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeletePeriod(period)}
                        className="btn-danger"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealPeriodWindow;