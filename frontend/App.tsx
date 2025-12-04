import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { AppView } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LOGIN);

  // 初始化时根据本地 token 判断是否已登录
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setView(AppView.DASHBOARD);
    }
  }, []);

  const handleLogin = () => {
    setView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username'); // 清除用户名
    setView(AppView.LOGIN);
  };

  return (
    <>
      {view === AppView.LOGIN ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </>
  );
};

export default App;