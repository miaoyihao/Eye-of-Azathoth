import { HashRouter, Routes, Route } from 'react-router-dom';
import CharacterList from './pages/CharacterList';
import CreateCharacter from './pages/CreateCharacter';

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<CharacterList />} />
            <Route path="/create" element={<CreateCharacter />} />
            <Route path="/edit/:id" element={<CreateCharacter />} />
          </Routes>
        </div>

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
              本地持久化
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
      </div>
    </HashRouter>
  );
}

export default App;
