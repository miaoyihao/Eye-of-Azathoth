import { HashRouter, Routes, Route } from 'react-router-dom';
import CharacterList from './pages/CharacterList';
import CreateCharacter from './pages/CreateCharacter';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<CharacterList />} />
        <Route path="/create" element={<CreateCharacter />} />
        <Route path="/edit/:id" element={<CreateCharacter />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
