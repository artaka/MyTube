import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadVideo, getVideo } from '../api/video';
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
  const [videoStatus, setVideoStatus] = useState(null); // 'pending' | 'processing' | 'ready' | 'failed'
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Poll processing status once upload completes
  useEffect(() => {
    if (!result?.video_id || !token) return;

    let timer = null;
    let isCancelled = false;

    const checkStatus = async () => {
      try {
        const v = await getVideo(result.video_id, token);
        if (isCancelled) return;
        setVideoStatus(v.status);
        if (v.status === 'ready' || v.status === 'failed') {
          return;
        }
        timer = setTimeout(checkStatus, 2500);
      } catch {
        if (!isCancelled) {
          timer = setTimeout(checkStatus, 3500);
        }
      }
    };

    checkStatus();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [result?.video_id, token]);

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
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    setError('');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 400);

    try {
      const data = await uploadVideo(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        file,
      });
      clearInterval(interval);
      setProgress(100);
      setResult(data);
      setVideoStatus('pending');
    } catch (err) {
      clearInterval(interval);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-page">
      <h1 className="upload-page__title">Студия: Загрузка видео</h1>

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
          <div className="upload-dropzone__text">Перетащите видеофайл сюда или нажмите для выбора</div>
          <div className="upload-dropzone__subtext">MP4, WebM, MKV, MOV • До 500 МБ</div>
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
          <div style={{ padding: 16, background: 'var(--yt-bg-secondary)', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="var(--yt-text-secondary)">
              <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ fontSize: 12, color: 'var(--yt-text-secondary)' }}>{(file.size / 1048576).toFixed(1)} МБ</div>
            </div>
            {!uploading && !result && (
              <button
                type="button"
                onClick={() => { setFile(null); setResult(null); setError(''); setProgress(0); setVideoStatus(null); }}
                style={{ color: '#cc0000', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Отмена
              </button>
            )}
          </div>

          <form className="upload-form" onSubmit={handleSubmit}>
            <div className="upload-form__field">
              <label>Название видео (обязательно)</label>
              <input
                type="text"
                required
                disabled={uploading || !!result}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите название видео"
              />
            </div>
            <div className="upload-form__field">
              <label>Описание</label>
              <textarea
                disabled={uploading || !!result}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Расскажите о своем видео, добавьте таймкоды..."
              />
            </div>

            {uploading && (
              <div className="upload-form__progress">
                <div className="upload-form__progress-bar">
                  <div className="upload-form__progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="upload-form__status">Загрузка файла на сервер... {Math.round(progress)}%</div>
              </div>
            )}

            {error && (
              <div className="upload-form__result upload-form__result--error">{error}</div>
            )}

            {result && (
              <div style={{
                background: 'rgba(6, 95, 212, 0.1)',
                border: '1px solid rgba(6, 95, 212, 0.3)',
                borderRadius: 12,
                padding: 20,
                marginTop: 16,
              }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--yt-text)', marginBottom: 8 }}>
                  {videoStatus === 'ready' && '✅ Видео успешно обработано и готово к просмотру!'}
                  {videoStatus === 'processing' && '⏳ Видео загружено и обрабатывается (нарезка HLS и превью)...'}
                  {videoStatus === 'pending' && '⏱ Видео в очереди на обработку...'}
                  {videoStatus === 'failed' && '❌ Произошла ошибка обработки видео.'}
                </div>

                <div style={{ fontSize: 13, color: 'var(--yt-text-secondary)', marginBottom: 16 }}>
                  ID видео: <span style={{ fontFamily: 'monospace' }}>{result.video_id}</span>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    style={{
                      background: '#065fd4',
                      color: '#fff',
                      padding: '10px 20px',
                      borderRadius: 20,
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: 'none',
                    }}
                    onClick={() => navigate(`/watch?v=${result.video_id}`)}
                  >
                    Перейти к видео →
                  </button>
                  <button
                    type="button"
                    style={{
                      background: 'var(--yt-chip-bg)',
                      color: 'var(--yt-text)',
                      padding: '10px 20px',
                      borderRadius: 20,
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: '1px solid var(--yt-border)',
                    }}
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                      setTitle('');
                      setDescription('');
                      setVideoStatus(null);
                    }}
                  >
                    Загрузить еще видео
                  </button>
                </div>
              </div>
            )}

            {!result && (
              <button
                type="submit"
                className="upload-form__submit"
                disabled={!title.trim() || uploading}
              >
                {uploading ? 'Загрузка...' : 'Опубликовать видео'}
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
