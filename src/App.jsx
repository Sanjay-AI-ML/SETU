import { Routes, Route } from 'react-router-dom';
import ConsentPage from './routes/ConsentPage.jsx';
import HomePage from './routes/HomePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/consent" element={<ConsentPage />} />
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}
