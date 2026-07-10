import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import CharacterList from './pages/CharacterList';
import CreateCharacter from './pages/CreateCharacter';
import Account from './pages/Account';

/**
 * 登录守卫：包裹需要登录才能访问的路由。
 * 未登录时显示提示，引导前往 /account 页面。
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!configured) {
    return <>{children}</>; // 未配置 Supabase 时直接放行（兼容本地开发）
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-coc-muted">加载中...</div>
      </div>
    );
  }

  // 如果在 /account 页面，不需要登录守卫
  if (location.pathname === '/account') {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-6xl mb-6 opacity-20 font-light">🔐</div>
          <h2 className="text-xl font-semibold text-coc-text mb-2">请先登录</h2>
          <p className="text-coc-muted text-sm mb-8 leading-relaxed">
            登录后可在云端保存和同步人物卡数据
          </p>
          <button
            onClick={() => navigate('/account')}
            className="md-fab px-8 py-3 text-base"
          >
            前往账号管理页
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<AuthGuard><CharacterList /></AuthGuard>} />
      <Route path="/create" element={<AuthGuard><CreateCharacter /></AuthGuard>} />
      <Route path="/edit/:id" element={<AuthGuard><CreateCharacter /></AuthGuard>} />
      <Route path="/account" element={<Account />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            <AppRoutes />
          </div>

          {/* 全局 Footer — 仅当已登录或未配置时显示 */ }
          <Footer />
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

/** 底部版权信息（与页内容器分离） */
function Footer() {
  return (
    <footer className="max-w-6xl w-full mx-auto px-4 mt-16 pt-6 border-t border-coc-border/30">
      <div className="text-xs text-coc-muted/50 text-center space-y-1">
        <p>
          <span className="font-medium text-coc-accent">COC 人物卡向导</span>
          <span className="mx-2 text-coc-border/50">·</span>
          <span className="font-mono">v0.8.0</span>
        </p>
        <p className="text-[11px] leading-relaxed opacity-70">
          离线可用 (HashRouter)
          <span className="mx-1.5 text-coc-border/50">·</span>
          云端同步
          <span className="mx-1.5 text-coc-border/50">·</span>
          复制骰娘命令
          <span className="mx-1.5 text-coc-border/50">·</span>
          导出 PDF
          <span className="mx-1.5 text-coc-border/50">·</span>
          导入/导出 Excel
          <span className="mx-1.5 text-coc-border/50">·</span>
          全属性拒绝采样掷骰 (总和=480)
          <span className="mx-1.5 text-coc-border/50">·</span>
          Material Design 3 风格
        </p>
      </div>
    </footer>
  );
}

export default App;
