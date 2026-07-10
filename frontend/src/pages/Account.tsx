/**
 * 账号管理页
 * =========
 * 提供登录/注册/修改密码/登出功能。
 * 管理员额外显示用户管理面板（增删改查、改角色）。
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type AdminUserInfo } from '@/context/AuthContext';

type PageMode = 'login' | 'register' | 'manage';

export default function Account() {
  const navigate = useNavigate();
  const {
    user, profile, profileLoading, isAdmin,
    loading, configured,
    signIn, signUp, signOut, updatePassword,
    refreshProfile,
    adminListUsers, adminCreateUser, adminDeleteUser,
    adminResetPassword, adminUpdateRole,
  } = useAuth();

  const [mode, setMode] = useState<PageMode>('login');

  // ── 表单状态 ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── 管理员面板状态 ──
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPwd, setNewUserPwd] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [resetPwdTarget, setResetPwdTarget] = useState<{ id: string; email: string } | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');

  // 登录后自动切换模式
  useEffect(() => {
    if (user) setMode('manage');
  }, [user]);

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    const list = await adminListUsers();
    setUsers(list);
    setUsersLoading(false);
  }, [isAdmin, adminListUsers]);

  // 切换到管理模式时加载用户列表
  useEffect(() => {
    if (mode === 'manage' && isAdmin) {
      loadUsers();
    }
  }, [mode, isAdmin, loadUsers]);

  // 刷新 profile（后台用）
  useEffect(() => {
    if (user) refreshProfile();
  }, [user, refreshProfile]);

  // ── 提示消息 ──
  const showMsg = (type: 'success' | 'error' | 'info', text: string) => setMessage({ type, text });
  const clearMsg = () => setMessage(null);

  // ── 登录 ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { showMsg('error', '请填写邮箱和密码'); return; }
    setSubmitting(true); clearMsg();
    const { error } = await signIn(email, password);
    if (error) {
      showMsg('error', error);
    } else {
      showMsg('success', '登录成功');
      setEmail(''); setPassword('');
    }
    setSubmitting(false);
  };

  // ── 注册 ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { showMsg('error', '请填写邮箱和密码'); return; }
    if (password.length < 6) { showMsg('error', '密码至少 6 位'); return; }
    setSubmitting(true); clearMsg();
    const { error, needsEmailConfirmation } = await signUp(email, password);
    if (error) {
      showMsg('error', error);
    } else if (needsEmailConfirmation) {
      showMsg('info', '注册成功！请查看邮箱完成验证（若未收到确认邮件，请联系管理员直接激活）');
    } else {
      showMsg('success', '注册成功！已自动登录');
      setEmail(''); setPassword('');
    }
    setSubmitting(false);
  };

  // ── 修改密码 ──
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { showMsg('error', '请填写新密码'); return; }
    if (newPassword.length < 6) { showMsg('error', '密码至少 6 位'); return; }
    if (newPassword !== confirmPassword) { showMsg('error', '两次密码不一致'); return; }
    setSubmitting(true); clearMsg();
    const { error } = await updatePassword(newPassword);
    if (error) {
      showMsg('error', error);
    } else {
      showMsg('success', '密码修改成功');
      setNewPassword(''); setConfirmPassword('');
    }
    setSubmitting(false);
  };

  // ── 登出 ──
  const handleLogout = async () => {
    await signOut();
    setMode('login');
    showMsg('info', '已登出');
  };

  // ── 管理员：创建用户 ──
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPwd) { showMsg('error', '请填写邮箱和密码'); return; }
    if (newUserPwd.length < 6) { showMsg('error', '密码至少 6 位'); return; }
    setSubmitting(true); clearMsg();
    const { success, error } = await adminCreateUser(newUserEmail, newUserPwd, newUserRole);
    if (success) {
      showMsg('success', `用户 ${newUserEmail} 创建成功`);
      setNewUserEmail(''); setNewUserPwd(''); setNewUserRole('user');
      setShowCreateForm(false);
      loadUsers();
    } else {
      showMsg('error', error || '创建失败');
    }
    setSubmitting(false);
  };

  // ── 管理员：删除用户 ──
  const handleDeleteUser = async (uid: string, uemail: string) => {
    if (!window.confirm(`确定删除用户 ${uemail}？\n该操作不可撤销，该用户的所有人物卡将被永久删除。`)) return;
    clearMsg();
    const { success, error } = await adminDeleteUser(uid);
    if (success) {
      showMsg('success', `用户 ${uemail} 已删除`);
      loadUsers();
    } else {
      showMsg('error', error || '删除失败');
    }
  };

  // ── 管理员：重置密码 ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdValue || resetPwdValue.length < 6) { showMsg('error', '密码至少 6 位'); return; }
    if (!resetPwdTarget) return;
    setSubmitting(true); clearMsg();
    const { success, error } = await adminResetPassword(resetPwdTarget.id, resetPwdValue);
    if (success) {
      showMsg('success', `${resetPwdTarget.email} 的密码已重置`);
      setResetPwdTarget(null); setResetPwdValue('');
    } else {
      showMsg('error', error || '重置失败');
    }
    setSubmitting(false);
  };

  // ── 管理员：更改角色 ──
  const handleUpdateRole = async (uid: string, newRole: string) => {
    clearMsg();
    const { success, error } = await adminUpdateRole(uid, newRole);
    if (success) {
      showMsg('success', `角色已更新为 ${newRole === 'admin' ? '管理员' : '普通用户'}`);
      loadUsers();
    } else {
      showMsg('error', error || '更新角色失败');
    }
  };

  // ── 加载中 ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-coc-muted">加载中...</div>
      </div>
    );
  }

  // ── 未配置 ──
  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4 opacity-20 font-light">⚙</div>
          <h2 className="text-xl font-semibold text-coc-text mb-2">尚未配置</h2>
          <p className="text-coc-muted text-sm mb-4">请联系管理员设置 Supabase 环境变量后使用。</p>
          <button onClick={() => navigate('/')} className="md-fab px-6 py-2">返回首页</button>
        </div>
      </div>
    );
  }

  // ── 页面样式常量 ──
  const inputCls = "w-full px-3 py-2 rounded-lg border border-coc-border bg-white text-sm text-coc-text focus:outline-none focus:ring-2 focus:ring-coc-accent/30 focus:border-coc-accent";
  const btnCls = "md-ripple px-4 py-2 rounded-lg text-sm font-medium transition-colors";
  const btnPrimary = `${btnCls} bg-coc-accent text-white hover:bg-coc-accent/90 disabled:opacity-50`;
  const btnDanger = `${btnCls} border border-coc-danger/30 text-coc-danger hover:bg-coc-danger/5`;
  const btnOutline = `${btnCls} border border-coc-border text-coc-text hover:bg-black/[0.04]`;

  return (
    <div className="min-h-screen pb-20">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-coc-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg text-coc-muted hover:text-coc-text hover:bg-black/[0.04] transition-colors" title="返回首页">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-coc-text tracking-tight">账号管理</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-6">
        {/* 消息提示 */}
        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            message.type === 'error'   ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* 已登录：账号管理 */}
        {mode === 'manage' && user && (
          <div className="space-y-6">
            {/* 当前账号信息 */}
            <div className="bg-white rounded-xl p-5 border border-coc-border/40">
              <h2 className="text-sm font-medium text-coc-muted mb-3">当前账号</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-coc-accent/10 flex items-center justify-center text-coc-accent font-semibold text-sm">
                  {user.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-coc-text">{user.email}</p>
                  <p className="text-xs text-coc-muted/60 flex items-center gap-2">
                    <span>ID: {user.id.slice(0, 8)}...</span>
                    {profileLoading ? (
                      <span className="text-coc-muted/40">加载角色中...</span>
                    ) : profile ? (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isAdmin ? '管理员' : '普通用户'}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>

            {/* 修改密码 */}
            <div className="bg-white rounded-xl p-5 border border-coc-border/40">
              <h2 className="text-sm font-medium text-coc-muted mb-4">修改密码</h2>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-coc-muted mb-1">新密码</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className={inputCls} placeholder="至少 6 位" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-coc-muted mb-1">确认新密码</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className={inputCls} placeholder="再次输入新密码" />
                </div>
                <button type="submit" disabled={submitting} className={btnPrimary}>
                  {submitting ? '提交中...' : '修改密码'}
                </button>
              </form>
            </div>

            {/* ── 管理员面板 ── */}
            {isAdmin && (
              <div className="bg-white rounded-xl border border-coc-border/40 overflow-hidden">
                <div className="p-5 border-b border-coc-border/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-coc-muted">用户管理</h2>
                      <p className="text-xs text-coc-muted/50 mt-0.5">管理员专属 · 共 {users.length} 个用户</p>
                    </div>
                    <button onClick={() => setShowCreateForm(!showCreateForm)} className={btnPrimary}>
                      {showCreateForm ? '取消' : '+ 创建用户'}
                    </button>
                  </div>

                  {/* 创建用户表单 */}
                  {showCreateForm && (
                    <form onSubmit={handleCreateUser} className="mt-4 p-4 bg-coc-bg rounded-lg space-y-3">
                      <h3 className="text-xs font-semibold text-coc-muted uppercase tracking-wider">创建新用户</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-coc-muted mb-1">邮箱</label>
                          <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                            className={inputCls} placeholder="user@email.com" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-coc-muted mb-1">密码</label>
                          <input type="password" value={newUserPwd} onChange={e => setNewUserPwd(e.target.value)}
                            className={inputCls} placeholder="至少 6 位" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-coc-text">
                          <input type="radio" name="newRole" checked={newUserRole === 'user'}
                            onChange={() => setNewUserRole('user')}
                            className="accent-coc-accent" />
                          普通用户
                        </label>
                        <label className="flex items-center gap-2 text-sm text-coc-text">
                          <input type="radio" name="newRole" checked={newUserRole === 'admin'}
                            onChange={() => setNewUserRole('admin')}
                            className="accent-coc-accent" />
                          管理员
                        </label>
                      </div>
                      <button type="submit" disabled={submitting} className={btnPrimary}>
                        {submitting ? '创建中...' : '确认创建'}
                      </button>
                    </form>
                  )}
                </div>

                {/* 用户列表 */}
                {usersLoading ? (
                  <div className="p-8 text-center text-xs text-coc-muted/50">加载中...</div>
                ) : users.length === 0 ? (
                  <div className="p-8 text-center text-xs text-coc-muted/50">暂无用户</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-coc-border/20 bg-coc-bg/50">
                          <th className="text-left px-4 py-3 text-xs font-medium text-coc-muted">邮箱</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-coc-muted">角色</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-coc-muted hidden sm:table-cell">注册时间</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-coc-muted">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b border-coc-border/10 hover:bg-coc-bg/30 transition-colors">
                            <td className="px-4 py-3 text-coc-text">
                              <span className="text-sm">{u.email}</span>
                              {u.id === user?.id && (
                                <span className="ml-2 text-[10px] text-coc-muted/50">(当前)</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {u.id === user?.id ? (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {u.role === 'admin' ? '管理员' : '用户'}
                                </span>
                              ) : (
                                <select
                                  value={u.role}
                                  onChange={e => handleUpdateRole(u.id, e.target.value)}
                                  className="text-xs border border-coc-border rounded px-1.5 py-1 bg-white text-coc-text focus:outline-none focus:ring-1 focus:ring-coc-accent/30"
                                >
                                  <option value="user">用户</option>
                                  <option value="admin">管理员</option>
                                </select>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-coc-muted/60 hidden sm:table-cell">
                              {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setResetPwdTarget({ id: u.id, email: u.email })}
                                  className="p-1.5 rounded text-coc-muted hover:text-coc-accent hover:bg-coc-accent/5 transition-colors"
                                  title="重置密码"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                                  </svg>
                                </button>
                                {u.id !== user?.id && (
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                    className="p-1.5 rounded text-coc-muted hover:text-coc-danger hover:bg-coc-danger/5 transition-colors"
                                    title="删除用户"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 重置密码弹窗 */}
            {resetPwdTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setResetPwdTarget(null)}>
                <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-sm font-semibold text-coc-text mb-1">重置密码</h3>
                  <p className="text-xs text-coc-muted/70 mb-4">用户：{resetPwdTarget.email}</p>
                  <form onSubmit={handleResetPassword} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-coc-muted mb-1">新密码</label>
                      <input type="password" value={resetPwdValue} onChange={e => setResetPwdValue(e.target.value)}
                        className={inputCls} placeholder="至少 6 位" autoFocus />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setResetPwdTarget(null); setResetPwdValue(''); }}
                        className={btnOutline + " flex-1"}>取消</button>
                      <button type="submit" disabled={submitting} className={btnPrimary + " flex-1"}>
                        {submitting ? '重置中...' : '确认重置'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 登出 */}
            <button onClick={handleLogout} className={btnDanger + " w-full"}>
              退出登录
            </button>

            <p className="text-xs text-coc-muted/50 text-center pt-2">
              删除账号请登录 Supabase 控制台操作，当前版本暂不支持前端自助删除。
            </p>
          </div>
        )}

        {/* 未登录：登录/注册切换 */}
        {mode !== 'manage' && (
          <div className="max-w-md mx-auto">
            {/* Tab 切换 */}
            <div className="flex mb-6 bg-coc-bg rounded-xl p-1">
              <button onClick={() => setMode('login')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === 'login' ? 'bg-white text-coc-text shadow-sm' : 'text-coc-muted hover:text-coc-text'
                }`}>登录</button>
              <button onClick={() => setMode('register')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === 'register' ? 'bg-white text-coc-text shadow-sm' : 'text-coc-muted hover:text-coc-text'
                }`}>注册</button>
            </div>

            {/* 登录表单 */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="bg-white rounded-xl p-5 border border-coc-border/40 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-coc-muted mb-1">邮箱</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className={inputCls} placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-coc-muted mb-1">密码</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className={inputCls} placeholder="••••••" />
                </div>
                <button type="submit" disabled={submitting} className={btnPrimary + " w-full"}>
                  {submitting ? '登录中...' : '登录'}
                </button>
              </form>
            )}

            {/* 注册表单 */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="bg-white rounded-xl p-5 border border-coc-border/40 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-coc-muted mb-1">邮箱</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className={inputCls} placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-coc-muted mb-1">密码</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className={inputCls} placeholder="至少 6 位" />
                </div>
                <button type="submit" disabled={submitting} className={btnPrimary + " w-full"}>
                  {submitting ? '注册中...' : '注册'}
                </button>
                <p className="text-xs text-coc-muted/50 text-center">
                  注册后若未自动登录，请查看邮箱完成验证。
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
