import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadVideo } from '../api/video';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../context/AuthModalContext';

export default function UploadPage() {
  const { token } = useAuth();
  const { openAuth } = useAuthModal();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  if (!token) {
    return (
      <div className="upload-page">
        <div className="login-required">
          <div className="login-required__icon">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          </div>
          <div className="login-required__text">Войдите, чтобы загрузить видео</div>
          <button className="login-required__btn" onClick={openAuth}>
            Войти
          </button>
        </div>
      </div>
    );
  }

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    setError('');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 500);

    try {
      const data = await uploadVideo(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        file,
      });
      clearInterval(interval);
      setProgress(100);
      setResult(data);
    } catch (err) {
      clearInterval(interval);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-page">
      <h1 className="upload-page__title">Загрузить видео</h1>

      {!file ? (
        <div
          className={`upload-dropzone ${dragActive ? 'upload-dropzone--active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="upload-dropzone__icon">
            <svg viewBox="0 0 24 24" width="64" height="64" fill="var(--yt-text-secondary)">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
            </svg>
          </div>
          <div className="upload-dropzone__text">Перетащите файл сюда или нажмите</div>
          <div className="upload-dropzone__subtext">MP4, WebM, MOV • Макс. 2 ГБ</div>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            hidden
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div>
          <div style={{ padding: 16, background: 'var(--yt-bg-secondary)', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="var(--yt-text-secondary)">
              <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ fontSize: 12, color: 'var(--yt-text-secondary)' }}>{(file.size / 1048576).toFixed(1)} МБ</div>
            </div>
            <button onClick={() => { setFile(null); setResult(null); setError(''); setProgress(0); }} style={{ color: '#cc0000', fontSize: 14, fontWeight: 500 }}>
              Удалить
            </button>
          </div>

          <form className="upload-form" onSubmit={handleSubmit}>
            <div className="upload-form__field">
              <label>Название (обязательно)</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите название видео"
              />
            </div>
            <div className="upload-form__field">
              <label>Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Добавьте описание"
              />
            </div>

            {uploading && (
              <div className="upload-form__progress">
                <div className="upload-form__progress-bar">
                  <div className="upload-form__progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="upload-form__status">Загрузка... {Math.round(progress)}%</div>
              </div>
            )}

            {error && (
              <div className="upload-form__result upload-form__result--error">{error}</div>
            )}

            {result && (
              <div className="upload-form__result upload-form__result--success">
                Видео загружено! ID: {result.video_id}
                <br />
                <button
                  type="button"
                  style={{ color: '#065fd4', marginTop: 8, fontWeight: 500 }}
                  onClick={() => navigate(`/watch?v=${result.video_id}`)}
                >
                  Открыть видео →
                </button>
              </div>
            )}

            <button
              type="submit"
              className="upload-form__submit"
              disabled={!title.trim() || uploading}
            >
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
