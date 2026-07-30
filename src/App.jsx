import { Routes, Route } from 'react-router-dom';
import ConsentPage from './routes/ConsentPage.jsx';
import HomePage from './routes/HomePage.jsx';
import ConsentGate from './components/common/ConsentGate.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/consent" element={<ConsentPage />} />
      <Route
        path="/"
        element={(
          <ConsentGate>
            <HomePage />
          </ConsentGate>
        )}
      />
    </Routes>
  );
}
