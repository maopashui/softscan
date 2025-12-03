import React, { useState } from 'react';
import { login, register } from '../services/ocrService';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await login(username, password);
      onLogin();
    } catch (err: any) {
        console.error(err);
        setError(err?.message || '登录失败，请稍后再试');
    } finally {
        setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('请输入账号和密码后再注册');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await register(username, password);
      setSuccess('注册成功，正在为你自动登录...');
      await login(username, password);
      onLogin();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || '注册失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soft-50 to-primary-100 p-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-white/50">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-primary-500/30">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
             </svg>
          </div>
          <h2 className="text-3xl font-bold text-soft-800 tracking-tight">
            {activeTab === 'login' ? '欢迎回来' : '创建账号'}
          </h2>
          <p className="text-soft-500 mt-2">SoftScan 图文识别系统</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 bg-soft-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => handleTabChange('login')}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'login'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-soft-600 hover:text-soft-800'
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('register')}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'register'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-soft-600 hover:text-soft-800'
            }`}
          >
            注册
          </button>
        </div>

        <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-soft-600 mb-2">账号</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-soft-50 border border-soft-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-soft-800"
              placeholder="请输入账号"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-soft-600 mb-2">密码</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-soft-50 border border-soft-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-soft-800"
              placeholder="请输入密码"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-semibold text-white shadow-lg transition-all transform hover:-translate-y-0.5
              ${loading ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/30'}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {activeTab === 'login' ? '登录中...' : '注册中...'}
              </span>
            ) : (
              activeTab === 'login' ? '立即登录' : '注册并登录'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;