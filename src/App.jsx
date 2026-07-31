import { Routes, Route } from 'react-router-dom';
import ConsentPage from './routes/ConsentPage.jsx';
import ChildProfilePage from './routes/ChildProfilePage.jsx';
import HomePage from './routes/HomePage.jsx';
import SessionOverviewPage from './routes/SessionOverviewPage.jsx';
import ActivityPrebriefPage from './routes/ActivityPrebriefPage.jsx';
import ActivityRunPage from './routes/ActivityRunPage.jsx';
import ActivityReviewPage from './routes/ActivityReviewPage.jsx';
import SessionResultsPage from './routes/SessionResultsPage.jsx';
import ReportPreviewPage from './routes/ReportPreviewPage.jsx';
import ConsentGate from './components/common/ConsentGate.jsx';
import RequireChildProfile from './components/common/RequireChildProfile.jsx';
import { SessionProvider } from './state/SessionContext.jsx';

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/consent" element={<ConsentPage />} />
        <Route element={<ConsentGate />}>
          <Route path="/child-profile" element={<ChildProfilePage />} />
          <Route element={<RequireChildProfile />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/session/overview" element={<SessionOverviewPage />} />
            <Route path="/session/activity/prebrief" element={<ActivityPrebriefPage />} />
            <Route path="/session/activity/run" element={<ActivityRunPage />} />
            <Route path="/session/activity/review" element={<ActivityReviewPage />} />
            <Route path="/session/results" element={<SessionResultsPage />} />
            <Route path="/session/report" element={<ReportPreviewPage />} />
          </Route>
        </Route>
      </Routes>
    </SessionProvider>
  );
}
