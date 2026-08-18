import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthModalProvider, useAuthModal } from './context/AuthModalContext';
import { ChannelProvider, useChannel } from './context/ChannelContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import AuthModal from './components/auth/AuthModal';
import HomePage from './pages/HomePage';
import WatchPage from './pages/WatchPage';
import ShortsPage from './pages/ShortsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import SearchResultsPage from './pages/SearchResultsPage';
import UploadPage from './pages/UploadPage';
import SettingsPage from './pages/SettingsPage';
import ChannelPage from './pages/ChannelPage';

function MyChannelRedirect() {
  const { user } = useAuth();
  const { myChannel } = useChannel();
  if (myChannel?.handle) {
    return <Navigate to={`/channel/${myChannel.handle}`} replace />;
  }
  if (user?.id) {
    return <Navigate to={`/channel/${user.id}`} replace />;
  }
  return <Navigate to="/" replace />;
}

function AppRoutes() {
  const { showAuth, openAuth, closeAuth } = useAuthModal();
  const { token } = useAuth();

  return (
    <>
      <Layout onLogin={openAuth}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/watch" element={<WatchPage />} />
          <Route path="/shorts" element={<ShortsPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/results" element={<SearchResultsPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/channel" element={<MyChannelRedirect />} />
          <Route path="/channel/:idOrHandle" element={<ChannelPage />} />
          {/* Catch all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      {showAuth && !token && <AuthModal onClose={closeAuth} />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChannelProvider>
          <AuthModalProvider>
            <AppRoutes />
          </AuthModalProvider>
        </ChannelProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
