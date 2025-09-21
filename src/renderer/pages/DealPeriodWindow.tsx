import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface DealPeriod {
  id?: number;
  name: string;
  start_date: string;
  end_date: string;
  created?: string;
  modified?: string;
}

const DealPeriodWindow: React.FC = () => {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<DealPeriod[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<DealPeriod | null>(null);
  const [formData, setFormData] = useState<DealPeriod>({
    name: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      const result = await window.electronAPI.db.all(
        'SELECT * FROM deal_periods ORDER BY start_date DESC'
      );
      setPeriods(result);
    } catch (error) {
      console.error('Failed to load periods:', error);
    }
  };

  const handleNewPeriod = () => {
    setEditingPeriod(null);
    setFormData({
      name: '',
      start_date: '',
      end_date: ''
    });
    setShowForm(true);
  };

  const handleEditPeriod = (period: DealPeriod) => {
    setEditingPeriod(period);
    setFormData({
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date
    });
    setShowForm(true);
  };

  const handleDeletePeriod = async (period: DealPeriod) => {
    const result = await window.electronAPI.showMessageBox({
      type: 'question',
      title: '削除確認',
      message: `期間「${period.name}」を削除しますか？`,
      buttons: ['キャンセル', '削除'],
      defaultId: 0,
      cancelId: 0
    });

    if (result.response === 1) {
      try {
        await window.electronAPI.db.run(
          'DELETE FROM deal_periods WHERE id = ?',
          [period.id]
        );
        loadPeriods();
      } catch (error) {
        console.error('Failed to delete period:', error);
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'エラー',
          message: '期間の削除に失敗しました。',
          buttons: ['OK']
        });
      }
    }
  };

  const handleSavePeriod = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: '入力エラー',
        message: 'すべての項目を入力してください。',
        buttons: ['OK']
      });
      return;
    }

    if (formData.start_date > formData.end_date) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: '入力エラー',
        message: '終了日は開始日より後の日付を指定してください。',
        buttons: ['OK']
      });
      return;
    }

    try {
      if (editingPeriod) {
        await window.electronAPI.db.run(
          `UPDATE deal_periods
           SET name = ?, start_date = ?, end_date = ?, modified = datetime('now', 'localtime')
           WHERE id = ?`,
          [formData.name, formData.start_date, formData.end_date, editingPeriod.id]
        );
      } else {
        await window.electronAPI.db.run(
          `INSERT INTO deal_periods (name, start_date, end_date)
           VALUES (?, ?, ?)`,
          [formData.name, formData.start_date, formData.end_date]
        );
      }
      setShowForm(false);
      loadPeriods();
    } catch (error) {
      console.error('Failed to save period:', error);
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'エラー',
        message: '期間の保存に失敗しました。',
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
                  <label className="form-label">開始日</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">終了日</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="form-input"
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
                <div key={period.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{period.name}</h3>
                      <p className="text-sm text-gray-600">
                        {period.start_date} ～ {period.end_date}
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