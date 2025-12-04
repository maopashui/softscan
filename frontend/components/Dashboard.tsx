import React, { useState, useEffect } from 'react';
import { fileToGenerativePart, performOCR, fetchOCRHistory, clearOCRHistory, getOCREngineConfig, setOCREngineToken, setOCREngineURL } from '../services/ocrService';
import { OCRResult, HistoryItem } from '../types';
import AnnotatedImage from './AnnotatedImage';
import UserManagement from './UserManagement';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTokenSettings, setShowTokenSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [ocrToken, setOcrToken] = useState("");
  const [ocrURL, setOcrURL] = useState("");
  const [configStatus, setConfigStatus] = useState<{ hasToken: boolean; hasURL: boolean; currentURL: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [username, setUsername] = useState<string>("");

  // 从后端加载 OCR 历史记录
  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchOCRHistory();
        setHistory(list);
      } catch (e) {
        console.error("加载历史记录失败", e);
      }
    };
    load();
  }, []);

  // 检查是否为管理员并获取配置状态（一次查询获取所有配置）
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const config = await getOCREngineConfig();
        setIsAdmin(true); // 如果能成功获取，说明是管理员
        setConfigStatus(config);
      } catch (e) {
        // 不是管理员或未设置
        setIsAdmin(false);
        setConfigStatus(null);
      }
    };
    checkAdmin();
  }, []);

  // 从 localStorage 读取用户名
  useEffect(() => {
    const savedUsername = localStorage.getItem("username");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const saveToHistory = (img: string, res: OCRResult) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      thumbnail: img, // 目前后端只保存文本，此字段仅在本地使用
      fullText: res.fullText,
      blocks: res.blocks
    };
    const newHistory = [newItem, ...history].slice(0, 10);
    setHistory(newHistory);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true);
      setResult(null);
      
      try {
        const base64 = await fileToGenerativePart(file);
        // Prepend mime type for display if using fileToGenerativePart which strips it
        // Re-adding it properly for img src
        const displaySrc = `data:${file.type};base64,${base64}`;
        setImage(displaySrc);
        
        // Call API
        const ocrData = await performOCR(base64);
        setResult(ocrData);
        saveToHistory(displaySrc, ocrData);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "识别失败，请检查网络或图片格式。";
        alert(errorMessage);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setImage(item.thumbnail);
    setResult({ fullText: item.fullText, blocks: item.blocks });
    setActiveTab('upload');
    setIsMobileMenuOpen(false); // 移动端点击历史记录后关闭菜单
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.fullText);
      alert("文本已复制到剪贴板");
    }
  };

  const clearHistory = async () => {
      if (window.confirm("确定要清空历史记录吗？")) {
          try {
              await clearOCRHistory();
              setHistory([]);
          } catch (e) {
              console.error("清空历史记录失败", e);
              alert("清空历史记录失败，请稍后重试");
          }
      }
  }

  const handleSetToken = async () => {
    if (!ocrToken.trim()) {
      alert("请输入 token");
      return;
    }
    try {
      await setOCREngineToken(ocrToken.trim());
                    alert("设置成功");
                    setOcrToken("");
                    setShowTokenSettings(false);
                    // 刷新状态（一次查询获取所有配置）
                    const config = await getOCREngineConfig();
                    setConfigStatus(config);
    } catch (e: any) {
      alert(e.message || "设置失败");
    }
  };

  const handleSetURL = async () => {
    if (!ocrURL.trim()) {
      alert("请输入 URL");
      return;
    }
    try {
      await setOCREngineURL(ocrURL.trim());
      alert("设置成功");
      setOcrURL("");
      setShowTokenSettings(false);
      // 刷新状态（一次查询获取所有配置）
      const config = await getOCREngineConfig();
      setConfigStatus(config);
    } catch (e: any) {
      alert(e.message || "设置失败");
    }
  };

  return (
    <div className="flex h-screen bg-soft-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-soft-200 flex-shrink-0 flex flex-col z-20 shadow-sm hidden md:flex">
        <div className="p-6 border-b border-soft-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          </div>
          <span className="font-bold text-soft-800 text-lg">SoftScan</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-soft-400 uppercase tracking-wider mb-2 px-2">菜单</div>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
            ${activeTab === 'upload' ? 'bg-primary-50 text-primary-600' : 'text-soft-600 hover:bg-soft-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            开始识别
          </button>
          
          {isAdmin && (
            <div className="mt-6 pt-6 border-t border-soft-100">
              <div className="text-xs font-semibold text-soft-400 uppercase tracking-wider mb-2 px-2">管理员</div>
              <button 
                onClick={() => setShowUserManagement(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-soft-600 hover:bg-soft-100 mb-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                用户管理
              </button>
              <button 
                onClick={() => {
                  // 如果已自定义 URL，预填充；否则留空显示默认值
                  if (configStatus?.hasURL && configStatus.currentURL) {
                    setOcrURL(configStatus.currentURL);
                  } else {
                    setOcrURL("");
                  }
                  setOcrToken(""); // 清空 token 输入框
                  setShowTokenSettings(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-soft-600 hover:bg-soft-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                OCR 引擎配置
                {(configStatus?.hasToken || configStatus?.hasURL) && (
                  <span className="ml-auto w-2 h-2 bg-green-500 rounded-full"></span>
                )}
              </button>
            </div>
          )}

          <div className="text-xs font-semibold text-soft-400 uppercase tracking-wider mt-6 mb-2 px-2 flex justify-between items-center">
              <span>最近历史</span>
              {history.length > 0 && (
                  <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-500">清空</button>
              )}
          </div>
          
          <div className="space-y-2">
            {history.length === 0 && (
                <div className="text-xs text-soft-400 px-3 py-2 italic">暂无历史记录</div>
            )}
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors hover:bg-soft-100 group text-left"
              >
                 <div className="w-8 h-8 rounded bg-soft-200 overflow-hidden flex-shrink-0">
                     <img src={item.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-soft-700 font-medium truncate text-xs">{(item.fullText || '').substring(0, 15) || '无文字'}</p>
                    <p className="text-soft-400 text-[10px]">{new Date(item.timestamp).toLocaleTimeString()}</p>
                 </div>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-soft-100">
          {username && (
            <div className="px-3 py-2 mb-2 text-sm text-soft-600">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">{username}</span>
              </div>
            </div>
          )}
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-soft-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white h-16 border-b border-soft-200 flex items-center justify-between px-4 z-10 flex-shrink-0">
           <button 
             onClick={() => setIsMobileMenuOpen(true)}
             className="text-soft-600 hover:text-soft-800"
           >
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
             </svg>
           </button>
           <span className="font-bold text-soft-800">SoftScan</span>
           <button onClick={onLogout} className="text-soft-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto h-full flex flex-col gap-6">
                
                {/* Header Section */}
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-soft-800">图文识别</h1>
                        <p className="text-soft-500 mt-1">上传图片，智能提取文本信息</p>
                    </div>
                    {/* Action Buttons */}
                     <label className={`cursor-pointer bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary-500/30 transition-all active:scale-95 flex items-center gap-2 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        <span>上传新图片</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>
                </div>

                {/* Content Area */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
                    
                    {/* Left: Image Preview */}
                    <div className="bg-white rounded-3xl shadow-sm border border-soft-200 p-4 flex flex-col relative">
                         <div className="flex items-center justify-between mb-4 px-2">
                             <h3 className="font-semibold text-soft-700">图片预览 / 标注</h3>
                             <span className="text-xs text-soft-400 bg-soft-50 px-2 py-1 rounded-full border border-soft-100">
                                {result ? `${result.blocks.length} 个文本块` : '等待上传'}
                             </span>
                         </div>
                         
                         <div className="flex-1 bg-soft-50/50 rounded-2xl border-2 border-dashed border-soft-200 overflow-hidden flex items-center justify-center relative">
                            {loading && (
                                <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-4"></div>
                                    <p className="text-primary-600 font-medium animate-pulse">正在智能识别中...</p>
                                </div>
                            )}

                            {image ? (
                                <AnnotatedImage 
                                    imageSrc={image} 
                                    blocks={result?.blocks || []} 
                                />
                            ) : (
                                <div className="text-center p-8">
                                    <div className="w-16 h-16 bg-soft-100 rounded-full flex items-center justify-center mx-auto mb-4 text-soft-400">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                    <p className="text-soft-500 font-medium">拖入图片 或 点击右上角上传</p>
                                    <p className="text-soft-400 text-sm mt-1">支持 JPG, PNG, WebP</p>
                                </div>
                            )}
                         </div>
                    </div>

                    {/* Right: Text Result */}
                    <div className="bg-white rounded-3xl shadow-sm border border-soft-200 p-4 flex flex-col">
                         <div className="flex items-center justify-between mb-4 px-2">
                             <h3 className="font-semibold text-soft-700">识别结果汇总</h3>
                             <button 
                                onClick={copyToClipboard}
                                disabled={!result}
                                className="text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                             >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                复制文本
                             </button>
                         </div>
                         
                         <div className="flex-1 relative">
                             <textarea 
                                readOnly
                                className="w-full h-full resize-none p-4 rounded-2xl bg-soft-50 border border-soft-200 text-soft-800 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all font-mono text-sm leading-relaxed"
                                placeholder="等待识别结果..."
                                value={result ? result.fullText : ''}
                             />
                             {!result && !loading && (
                                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                                     <span className="text-soft-400 text-sm">暂无数据</span>
                                 </div>
                             )}
                         </div>
                    </div>

                </div>
            </div>
        </div>
      </main>

      {/* OCR 配置设置模态框 */}
      {showTokenSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-soft-800">OCR 引擎配置</h3>
              <button
                onClick={() => {
                  setShowTokenSettings(false);
                  setOcrToken("");
                  setOcrURL("");
                }}
                className="text-soft-400 hover:text-soft-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-soft-700 mb-2">
                第三方 OCR 引擎 URL
              </label>
              <input
                type="text"
                value={ocrURL}
                onChange={(e) => setOcrURL(e.target.value)}
                placeholder={configStatus?.currentURL || "http://example.com/ocr"}
                className="w-full px-4 py-2 border border-soft-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {configStatus && (
                <p className="mt-2 text-xs text-soft-500">
                  当前: {configStatus.currentURL}
                  {configStatus.hasURL && (
                    <span className="ml-2 text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      已自定义
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-soft-700 mb-2">
                第三方 OCR 引擎 Token
              </label>
              <input
                type="password"
                value={ocrToken}
                onChange={(e) => setOcrToken(e.target.value)}
                placeholder="请输入 token"
                className="w-full px-4 py-2 border border-soft-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {configStatus?.hasToken && (
                <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  当前已设置 token
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTokenSettings(false);
                  setOcrToken("");
                  setOcrURL("");
                }}
                className="flex-1 px-4 py-2 border border-soft-200 rounded-lg text-soft-700 hover:bg-soft-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  try {
                    let saved = false;
                    if (ocrURL.trim()) {
                      await setOCREngineURL(ocrURL.trim());
                      saved = true;
                    }
                    if (ocrToken.trim()) {
                      await setOCREngineToken(ocrToken.trim());
                      saved = true;
                    }
                    if (!saved) {
                      alert("请至少填写一项配置");
                      return;
                    }
                    alert("设置成功");
                    setOcrToken("");
                    setOcrURL("");
                    setShowTokenSettings(false);
                    // 刷新状态（一次查询获取所有配置）
                    const config = await getOCREngineConfig();
                    setConfigStatus(config);
                  } catch (e: any) {
                    alert(e.message || "设置失败");
                  }
                }}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户管理模态框 */}
      {showUserManagement && (
        <UserManagement onClose={() => setShowUserManagement(false)} />
      )}

      {/* 移动端抽屉菜单 */}
      {isMobileMenuOpen && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* 抽屉菜单 */}
          <aside className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-soft-200 flex flex-col z-50 shadow-xl md:hidden transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="p-6 border-b border-soft-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
                <span className="font-bold text-soft-800 text-lg">SoftScan</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-soft-400 hover:text-soft-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <div className="text-xs font-semibold text-soft-400 uppercase tracking-wider mb-2 px-2">菜单</div>
              <button 
                onClick={() => {
                  setActiveTab('upload');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${activeTab === 'upload' ? 'bg-primary-50 text-primary-600' : 'text-soft-600 hover:bg-soft-100'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                开始识别
              </button>
              
              {isAdmin && (
                <div className="mt-6 pt-6 border-t border-soft-100">
                  <div className="text-xs font-semibold text-soft-400 uppercase tracking-wider mb-2 px-2">管理员</div>
                  <button 
                    onClick={() => {
                      setShowUserManagement(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-soft-600 hover:bg-soft-100 mb-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    用户管理
                  </button>
                  <button 
                    onClick={() => {
                      // 如果已自定义 URL，预填充；否则留空显示默认值
                      if (configStatus?.hasURL && configStatus.currentURL) {
                        setOcrURL(configStatus.currentURL);
                      } else {
                        setOcrURL("");
                      }
                      setOcrToken(""); // 清空 token 输入框
                      setShowTokenSettings(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-soft-600 hover:bg-soft-100"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    OCR 引擎配置
                    {(configStatus?.hasToken || configStatus?.hasURL) && (
                      <span className="ml-auto w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                  </button>
                </div>
              )}

              <div className="text-xs font-semibold text-soft-400 uppercase tracking-wider mt-6 mb-2 px-2 flex justify-between items-center">
                  <span>最近历史</span>
                  {history.length > 0 && (
                      <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-500">清空</button>
                  )}
              </div>
              
              <div className="space-y-2">
                {history.length === 0 && (
                    <div className="text-xs text-soft-400 px-3 py-2 italic">暂无历史记录</div>
                )}
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors hover:bg-soft-100 group text-left"
                  >
                     <div className="w-8 h-8 rounded bg-soft-200 overflow-hidden flex-shrink-0">
                         <img src={item.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-soft-700 font-medium truncate text-xs">{(item.fullText || '').substring(0, 15) || '无文字'}</p>
                        <p className="text-soft-400 text-[10px]">{new Date(item.timestamp).toLocaleTimeString()}</p>
                     </div>
                  </button>
                ))}
              </div>
            </nav>

            <div className="p-4 border-t border-soft-100">
              {username && (
                <div className="px-3 py-2 mb-2 text-sm text-soft-600">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium">{username}</span>
                  </div>
                </div>
              )}
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-soft-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                退出登录
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default Dashboard;