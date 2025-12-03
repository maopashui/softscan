import React, { useState, useEffect } from 'react';
import { getUserList, updateUserLimit, UserInfo } from '../services/ocrService';

interface UserManagementProps {
  onClose: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onClose }) => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editLimit, setEditLimit] = useState<number>(3);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await getUserList();
      setUsers(list);
    } catch (e: any) {
      alert(e.message || "加载用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLimit = async (userId: number) => {
    if (editLimit < 1) {
      alert("限制次数必须大于 0");
      return;
    }
    try {
      await updateUserLimit(userId, editLimit);
      alert("更新成功");
      setEditingUserId(null);
      loadUsers();
    } catch (e: any) {
      alert(e.message || "更新失败");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-soft-200">
          <h3 className="text-xl font-semibold text-soft-800">用户管理</h3>
          <button
            onClick={onClose}
            className="text-soft-400 hover:text-soft-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-soft-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-soft-700">用户名</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-soft-700">每日限制</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-soft-700">今日已用</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-soft-700">注册时间</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-soft-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-soft-400">
                        暂无用户
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b border-soft-100 hover:bg-soft-50">
                        <td className="py-3 px-4 text-sm text-soft-800 font-medium">{user.username}</td>
                        <td className="py-3 px-4 text-sm text-soft-600">
                          {editingUserId === user.id ? (
                            <input
                              type="number"
                              min="1"
                              value={editLimit}
                              onChange={(e) => setEditLimit(parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border border-soft-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          ) : (
                            <span className="font-medium">{user.daily_limit}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-soft-600">
                          <span className={`font-medium ${user.used_today >= user.daily_limit ? 'text-red-500' : 'text-green-500'}`}>
                            {user.used_today} / {user.daily_limit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-soft-500">{user.created_at}</td>
                        <td className="py-3 px-4">
                          {editingUserId === user.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateLimit(user.id)}
                                className="text-xs px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUserId(null);
                                  setEditLimit(3);
                                }}
                                className="text-xs px-3 py-1 border border-soft-200 rounded hover:bg-soft-50 transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingUserId(user.id);
                                setEditLimit(user.daily_limit);
                              }}
                              className="text-xs px-3 py-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            >
                              编辑
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;

