import { useEffect, useMemo, useState } from 'react';
import { capturePhoto, getHealth, getPhotos, PHOTO_BASE } from './api';

const COUNTDOWN_START = 3;

export default function App() {
  const [status, setStatus] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const statusLabel = useMemo(() => {
    if (!status) return 'Checking camera...';
    if (status.ready) return 'Camera ready';
    return 'Camera not detected';
  }, [status]);

  const statusTone = status?.ready ? 'ok' : 'warn';

  useEffect(() => {
    refreshStatus();
    refreshPhotos();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      refreshStatus();
    }, 8000);
    return () => clearInterval(id);
  }, []);

  async function refreshStatus() {
    try {
      const data = await getHealth();
      setStatus(data);
    } catch (err) {
      setStatus(null);
      setError(err.message || 'Unable to reach server');
    }
  }

  async function refreshPhotos() {
    try {
      const data = await getPhotos();
      setPhotos(data.photos || []);
    } catch (err) {
      setError(err.message || 'Unable to list photos');
    }
  }

  function startCaptureFlow() {
    if (isCapturing) return;
    setError('');
    setMessage('');

    let remaining = COUNTDOWN_START;
    setCountdown(remaining);

    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        setCountdown(null);
        doCapture();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }

  async function doCapture() {
    setIsCapturing(true);
    try {
      const photo = await capturePhoto();
      setMessage(photo.mock ? 'Captured (mock)' : 'Captured!');
      await refreshPhotos();
    } catch (err) {
      setError(err.message || 'Capture failed');
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="eyebrow">Canon 80D Photo Booth</p>
          <h1>Touch to Capture</h1>
          <p className="subtext">
            Photos save to the local <code>photos</code> folder.
          </p>
        </div>
        <StatusBadge label={statusLabel} tone={statusTone} />
      </header>

      <main>
        <section className="panel">
          <div className="panel__body">
            <div className="big-number">
              {countdown !== null ? countdown : 'Ready'}
            </div>
            <div className="actions">
              <button
                className="primary"
                onClick={startCaptureFlow}
                disabled={isCapturing}
              >
                {isCapturing ? 'Capturing...' : 'Start Capture'}
              </button>
              {status?.mock && (
                <p className="note">Mock mode enabled (no real camera needed)</p>
              )}
            </div>
          </div>
          {(error || message) && (
            <div className={`alert ${error ? 'alert--error' : 'alert--ok'}`}>
              {error || message}
            </div>
          )}
        </section>

        <section className="panel panel--secondary">
          <div className="panel__header">
            <div>
              <h2>Recent Photos</h2>
              <p className="subtext">
                Files served from <code>/photos</code> on the backend.
              </p>
            </div>
            <button className="ghost" onClick={refreshPhotos}>
              Refresh
            </button>
          </div>
          {photos.length === 0 ? (
            <div className="empty">No photos yet. Capture one!</div>
          ) : (
            <div className="gallery">
              {photos.map((photo) => (
                <div className="card" key={photo.filename}>
                  <img
                    src={`${PHOTO_BASE}/${photo.filename}`}
                    alt={photo.filename}
                  />
                  <div className="card__meta">
                    <p className="filename">{photo.filename}</p>
                    <p className="meta">
                      {new Date(photo.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ label, tone }) {
  return (
    <div className={`status status--${tone}`}>
      <span className="dot" />
      {label}
    </div>
  );
}

