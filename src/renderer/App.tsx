import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import MainWindow from './pages/MainWindow';
import SetupWindow from './pages/SetupWindow';
import DealPeriodWindow from './pages/DealPeriodWindow';
import AboutWindow from './pages/AboutWindow';
import EnvironmentWindow from './pages/EnvironmentWindow';

const App: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Electron環境でのみメニューアクションを監視
    if (typeof window !== 'undefined' && window.electronAPI) {
      // Listen for menu actions
      window.electronAPI.onMenuAction((action: string) => {
        switch (action) {
          case 'menu-about':
            navigate('/about');
            break;
          case 'menu-manage-periods':
            navigate('/periods');
            break;
          case 'menu-environment':
            navigate('/environment');
            break;
          default:
            // Handle other menu actions in respective components
            break;
        }
      });

      return () => {
        window.electronAPI.removeMenuListeners();
      };
    }
  }, [navigate]);

  return (
    <div className="h-screen overflow-hidden">
      <Routes>
        <Route path="/" element={<MainWindow />} />
        <Route path="/setup" element={<SetupWindow />} />
        <Route path="/periods" element={<DealPeriodWindow />} />
        <Route path="/about" element={<AboutWindow />} />
        <Route path="/environment" element={<EnvironmentWindow />} />
      </Routes>
    </div>
  );
};

export default App;