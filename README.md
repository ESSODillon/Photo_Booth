# Photo Booth

React + Node photo booth tailored for a Canon 80D. Captures photos through the backend and saves them to the local `photos` folder, then exposes them to the frontend gallery.

## Prerequisites

- Node 18+ and npm
- (Recommended for real captures) `gphoto2` installed and a Canon 80D connected via USB. On Windows, easiest path is WSL with USB passthrough and `gphoto2` inside WSL, or use mock mode for development.

## Setup

```bash
# from repo root
npm install          # installs root dev tools
npm run install:all  # installs server + client deps

# run both server and client together
npm run dev

# or separately
npm run dev:server   # http://localhost:5000
npm run dev:client   # http://localhost:5173
```

### Configuration

Create a `.env` in `server/` (you can copy `server/env.sample`):

```
PORT=5000
PHOTOS_DIR=../photos       # optional, defaults to ../photos
CAMERA_CMD=gphoto2         # override if your CLI is different
USE_MOCK_CAMERA=false      # set true to generate placeholder shots
```

The server serves images from `/photos/*` and the React app points at `http://localhost:5000` by default. You can change the frontend API target by setting `VITE_API_URL` in `client/.env`.

## How it works

- Backend (`server/index.js`): Express API with three endpoints:
  - `GET /api/health` – reports camera readiness and paths
  - `GET /api/photos` – lists saved images from `photos`
  - `POST /api/capture` – triggers `gphoto2 --capture-image-and-download` and saves into `photos/photo-<timestamp>.jpg`
  - Serves static files under `/photos`
- Frontend (`client/`): Vite + React single-page UI with a big capture button, countdown, status badge, and recent-photo grid.

## Notes for Canon 80D on Windows

- If using WSL: install `gphoto2` in WSL, plug the camera in, make sure WSL has USB access, then run the server inside WSL so `gphoto2` can see the device.
- If `gphoto2` is not available, flip `USE_MOCK_CAMERA=true` to exercise the flow without hardware.

## Saving photos

Photos land in the root `photos` folder. It’s ignored by Git by default so you don’t accidentally commit images; remove it from `.gitignore` if you want them tracked. Add backup/sync of that folder as needed.
