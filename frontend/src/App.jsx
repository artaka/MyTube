import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthModalProvider, useAuthModal } from './context/AuthModalContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import AuthModal from './components/auth/AuthModal';
import HomePage from './pages/HomePage';
import WatchPage from './pages/WatchPage';
import UploadPage from './pages/UploadPage';

function AppRoutes() {
  const { showAuth, openAuth, closeAuth } = useAuthModal();
  const { token } = useAuth();

  return (
    <>
      <Layout onLogin={openAuth}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/watch" element={<WatchPage />} />
          <Route path="/upload" element={<UploadPage />} />
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
        <AuthModalProvider>
          <AppRoutes />
        </AuthModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
