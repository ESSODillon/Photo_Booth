require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 5000;
const PHOTOS_DIR = path.resolve(
  process.env.PHOTOS_DIR || path.join(__dirname, '..', 'photos')
);
const CAMERA_CMD = process.env.CAMERA_CMD || 'gphoto2';
const USE_MOCK = process.env.USE_MOCK_CAMERA === 'true';

const app = express();

// Tiny 1x1 JPEG used when USE_MOCK_CAMERA=true so the UI can still flow.
const PLACEHOLDER_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALCwsMCxQNDQ0VEBISFhUVFRUYGBgVFRYVFRUYFxgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/2wBDAQwNDQ0UExYUFxgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAwT/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCfAAH/2Q==',
  'base64'
);

async function ensurePhotosDir() {
  await fsp.mkdir(PHOTOS_DIR, { recursive: true });
}

function spawnCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function checkCamera() {
  if (USE_MOCK) {
    return { ready: true, mock: true, message: 'Using mock camera' };
  }

  try {
    const result = await spawnCommand(CAMERA_CMD, ['--auto-detect']);
    const detected =
      result.stdout.toLowerCase().includes('canon') ||
      result.stdout.toLowerCase().includes('usb');
    return {
      ready: result.code === 0 && detected,
      mock: false,
      detected,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      exitCode: result.code,
    };
  } catch (err) {
    return { ready: false, mock: false, error: err.message };
  }
}

async function createMockPhoto(filepath) {
  await fsp.writeFile(filepath, PLACEHOLDER_JPEG);
}

async function runCameraCapture(filepath) {
  const args = ['--capture-image-and-download', `--filename=${filepath}`];
  const result = await spawnCommand(CAMERA_CMD, args);
  if (result.code !== 0) {
    const error = new Error(
      `Camera command failed with code ${result.code}: ${result.stderr || result.stdout}`
    );
    error.details = result;
    throw error;
  }
}

async function capturePhoto() {
  await ensurePhotosDir();
  const filename = `photo-${Date.now()}.jpg`;
  const filepath = path.join(PHOTOS_DIR, filename);

  if (USE_MOCK) {
    await createMockPhoto(filepath);
  } else {
    await runCameraCapture(filepath);
  }

  return {
    filename,
    filepath,
    url: `/photos/${filename}`,
    createdAt: new Date().toISOString(),
    mock: USE_MOCK,
  };
}

async function listPhotos() {
  await ensurePhotosDir();
  const entries = await fsp.readdir(PHOTOS_DIR);
  const photoFiles = entries.filter((file) => file.match(/\.(jpe?g|png)$/i));

  const items = await Promise.all(
    photoFiles.map(async (file) => {
      const stats = await fsp.stat(path.join(PHOTOS_DIR, file));
      return {
        filename: file,
        url: `/photos/${file}`,
        createdAt: stats.birthtime || stats.ctime,
        size: stats.size,
      };
    })
  );

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/photos', express.static(PHOTOS_DIR));

app.get('/api/health', async (_req, res) => {
  const status = await checkCamera();
  res.json({
    ok: !!status.ready,
    ready: !!status.ready,
    mock: USE_MOCK,
    cameraCommand: CAMERA_CMD,
    photosDir: PHOTOS_DIR,
    detail: status,
  });
});

app.get('/api/photos', async (_req, res) => {
  try {
    const photos = await listPhotos();
    res.json({ photos });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to read photos' });
  }
});

app.post('/api/capture', async (_req, res) => {
  try {
    const photo = await capturePhoto();
    res.json(photo);
  } catch (err) {
    console.error('Capture failed', err);
    res
      .status(500)
      .json({ error: err.message || 'Capture failed', details: err.details });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, async () => {
  await ensurePhotosDir();
  console.log(`Photo booth backend listening on http://localhost:${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason);
});

