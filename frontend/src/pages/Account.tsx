/**
 * 账号管理页
 * =========
 * 独立页面，提供完整的注册/登录/账号管理功能。
 * 入口：HashRouter 的 /account 路由
 *
 * 未登录态：
 *   - 默认显示登录表单
 *   - 可切换到注册表单
 * 已登录态：
 *   - 显示当前邮箱
 *   - 修改密码
 *   - 登出
 *   - 删除账号（提示需联系管理员）
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

type PageMode = 'login' | 'register' | 'manage';

export default function Account() {
  const navigate = useNavigate();
  const { user, loading, configured, signIn, signUp, signOut, updatePassword } = useAuth();
  const [mode, setMode] = useState<PageMode>('login');

  // ── 表单状态 ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 如果已登录，切换到管理模式
  useEffect(() => {
    if (user) setMode('manage');
  }, [user]);

  // ── 登录 ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setMessage({ type: 'error', text: '请填写邮箱和密码' }); return; }
    setSubmitting(true);
    setMessage(null);
    const { error } = await signIn(email, password);
    if (error) {
      setMessage({ type: 'error', text: error });
    } else {
      setMessage({ type: 'success', text: '登录成功' });
      setEmail('');
      setPassword('');
    }
    setSubmitting(false);
  };

  // ── 注册 ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setMessage({ type: 'error', text: '请填写邮箱和密码' }); return; }
    if (password.length < 6) { setMessage({ type: 'error', text: '密码至少 6 位' }); return; }
    setSubmitting(true);
    setMessage(null);
    const { error, needsEmailConfirmation } = await signUp(email, password);
    if (error) {
      setMessage({ type: 'error', text: error });
    } else if (needsEmailConfirmation) {
      setMessage({ type: 'info', text: '注册成功！请查看邮箱完成验证（若未收到确认邮件，请联系管理员直接激活）' });
    } else {
      setMessage({ type: 'success', text: '注册成功！已自动登录' });
      setEmail('');
      setPassword('');
    }
    setSubmitting(false);
  };

  // ── 修改密码 ──
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { setMessage({ type: 'error', text: '请填写新密码' }); return; }
    if (newPassword.length < 6) { setMessage({ type: 'error', text: '密码至少 6 位' }); return; }
    if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: '两次密码不一致' }); return; }
    setSubmitting(true);
    setMessage(null);
    const { error } = await updatePassword(newPassword);
    if (error) {
      setMessage({ type: 'error', text: error });
    } else {
      setMessage({ type: 'success', text: '密码修改成功' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setSubmitting(false);
  };

  // ── 登出 ──
  const handleLogout = async () => {
    await signOut();
    setMode('login');
    setMessage({ type: 'info', text: '已登出' });
  };

  // ── 加载中 ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-coc-muted">加载中...</div>
      </div>
    );
  }

  // ── 未配置 Supabase 的提示 ──
  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4 opacity-20 font-light">⚙</div>
          <h2 className="text-xl font-semibold text-coc-text mb-2">尚未配置</h2>
          <p className="text-coc-muted text-sm mb-4">
            请联系管理员设置 Supabase 环境变量后使用。
          </p>
          <button onClick={() => navigate('/')} className="md-fab px-6 py-2">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-coc-border/50">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg text-coc-muted hover:text-coc-text hover:bg-black/[0.04] transition-colors" title="返回首页">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-coc-text tracking-tight">账号管理</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 mt-8">
        {/* 消息提示 */}
        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm mb-6 ${
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
                  <p className="text-xs text-coc-muted/60">
                    用户 ID: {user.id.slice(0, 8)}...
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
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-coc-border bg-white text-sm text-coc-text focus:outline-none focus:ring-2 focus:ring-coc-accent/30 focus:border-coc-accent"
                    placeholder="至少 6 位"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-coc-muted mb-1">确认新密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-coc-border bg-white text-sm text-coc-text focus:outline-none focus:ring-2 focus:ring-coc-accent/30 focus:border-coc-accent"
                    placeholder="再次输入新密码"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full md-ripple px-4 py-2 rounded-lg bg-coc-accent text-white text-sm font-medium hover:bg-coc-accent/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? '提交中...' : '修改密码'}
                </button>
              </form>
            </div>

            {/* 登出 */}
            <button
              onClick={handleLogout}
              className="w-full md-ripple px-4 py-2.5 rounded-lg border border-coc-danger/30 text-coc-danger text-sm font-medium hover:bg-coc-danger/5 transition-colors"
            >
              退出登录
            </button>

            <p className="text-xs text-coc-muted/50 text-center pt-2">
              删除账号请登录 Supabase 控制台操作，当前版本暂不支持前端自助删除。
            </p>
          </div>
        )}

        {/* 未登录：登录/注册切换 */}
        {mode !== 'manage' && (
          <div>
            {/* Tab 切换 */}
            <div className="flex mb-6 bg-coc-bg rounded-xl p-1">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === 'login' ? 'bg-white text-coc-text shadow-sm' : 'text-coc-muted hover:text-coc-text'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === 'register' ? 'bg-white text-coc-text shadow-sm' : 'text-coc-muted hover:text-coc-text'
                }`}
              >
                注册
              </button>
            </div>

            {/* 登录表单 */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="bg-white rounded-xl p-5 border border-coc-border/40 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-coc-muted mb-1">邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-coc-border bg-white text-sm text-coc-text focus:outline-none focus:ring-2 focus:ring-coc-accent/30 focus:border-coc-accent"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-coc-muted mb-1">密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-coc-border bg-white text-sm text-coc-text focus:outline-none focus:ring-2 focus:ring-coc-accent/30 focus:border-coc-accent"
                    placeholder="••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full md-ripple px-4 py-2.5 rounded-lg bg-coc-accent text-white text-sm font-semibold hover:bg-coc-accent/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? '登录中...' : '登录'}
                </button>
              </form>
            )}

            {/* 注册表单 */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="bg-white rounded-xl p-5 border border-coc-border/40 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-coc-muted mb-1">邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-coc-border bg-white text-sm text-coc-text focus:outline-none focus:ring-2 focus:ring-coc-accent/30 focus:border-coc-accent"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-coc-muted mb-1">密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-coc-border bg-white text-sm text-coc-text focus:outline-none focus:ring-2 focus:ring-coc-accent/30 focus:border-coc-accent"
                    placeholder="至少 6 位"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full md-ripple px-4 py-2.5 rounded-lg bg-coc-accent text-white text-sm font-semibold hover:bg-coc-accent/90 transition-colors disabled:opacity-50"
                >
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
