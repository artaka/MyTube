import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { CloseIcon, GoogleIcon } from '../common/Icons';

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, loginWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, username, password);
        await login(email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose}>
          <CloseIcon />
        </button>

        <div className="modal__title">
          {mode === 'login' ? 'Вход' : 'Регистрация'}
        </div>

        <div className="modal__tabs">
          <button
            className={`modal__tab ${mode === 'login' ? 'modal__tab--active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Вход
          </button>
          <button
            className={`modal__tab ${mode === 'register' ? 'modal__tab--active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__field">
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          {mode === 'register' && (
            <div className="modal__field">
              <label>Имя пользователя</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
              />
            </div>
          )}

          <div className="modal__field">
            <label>Пароль</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 3 символа"
            />
          </div>

          {error && <div className="modal__error">{error}</div>}

          <button className="modal__submit" type="submit" disabled={loading}>
            {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="modal__divider">или</div>

        <button className="modal__google-btn" onClick={handleGoogle}>
          <GoogleIcon />
          Войти через Google
        </button>
      </div>
    </div>
  );
}
