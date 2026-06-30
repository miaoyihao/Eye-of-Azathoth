import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CharacterList from './pages/CharacterList';
import CreateCharacter from './pages/CreateCharacter';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CharacterList />} />
        <Route path="/create" element={<CreateCharacter />} />
        <Route path="/edit/:id" element={<CreateCharacter />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
