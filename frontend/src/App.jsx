import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Vote from './pages/Vote';
import Confirmation from './pages/Confirmation';
import Success from './pages/Success';
import VerifiedVotes from './pages/VerifiedVotes';
import RunoffVote from './pages/RunoffVote';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import Members from './pages/admin/Members';
import Candidates from './pages/admin/Candidates';
import Votes from './pages/admin/Votes';
import Results from './pages/admin/Results';
import Runoffs from './pages/admin/Runoffs';
import LocationResults from './pages/admin/LocationResults';
import SettingsPage from './pages/admin/Settings';

const App = ({ toggleTheme, currentTheme }) => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/vote" element={<Vote />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/success" element={<Success />} />
        <Route path="/verified-votes" element={<VerifiedVotes />} />
        <Route path="/runoff/:runoffId" element={<RunoffVote />} />
      </Route>

      {/* Admin Login (no layout) */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Protected Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout toggleTheme={toggleTheme} currentTheme={currentTheme} />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="votes" element={<Votes />} />
        <Route path="results" element={<Results />} />
        <Route path="runoffs" element={<Runoffs />} />
        <Route path="location-results" element={<LocationResults />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
