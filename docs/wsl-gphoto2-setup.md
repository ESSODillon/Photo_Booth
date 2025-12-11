# WSL + USB passthrough + gphoto2 (Canon 80D)

Guide for running the photo booth backend on Windows via WSL with USB passthrough and `gphoto2`.

## Prereqs

- Windows 10/11 with WSL installed (Ubuntu recommended).
- Admin PowerShell available.
- Camera connected over USB (set camera to PC connect mode; disable Wi‑Fi on the camera).
- Install `usbipd-win`:  
  In admin PowerShell:
  ```powershell
  winget install --id=Microsoft.usbipd
  ```

## One-time WSL prep

Open a WSL shell (Ubuntu) and install gphoto2:

```bash
sudo apt update
sudo apt install -y gphoto2
```

## Attaching the camera to WSL

1. In **admin PowerShell** (Windows):

```powershell
usbipd wsl list          # find the busid for the Canon 80D
usbipd wsl attach --busid <BUSID> --distribution Ubuntu
```

If attach fails, make sure the camera is on and not claimed by other software (e.g., EOS Utility).

2. In **WSL (Ubuntu)**, verify:

```bash
lsusb | grep -i canon
gphoto2 --auto-detect
gphoto2 --summary      # should show camera details
```

## Run the photo booth backend in WSL

From the repo root (mounted in WSL, e.g., `/mnt/c/Users/.../Photo_Booth`):

```bash
cd /mnt/c/Users/dillo/OneDrive/Desktop/Photo_Booth
cp server/env.sample server/.env   # adjust as needed
echo "USE_MOCK_CAMERA=false" >> server/.env
echo "CAMERA_CMD=gphoto2" >> server/.env

# install deps if not yet done
npm install
npm run install:all

# start backend only (from WSL)
npm run dev:server   # listens on http://localhost:5000
```

Then start the frontend (can be in Windows or WSL):

```bash
npm run dev:client   # Vite on http://localhost:5173
```

The frontend will call the backend at `http://localhost:5000` by default.

## Re-attaching after unplug/reboot

Each time the camera is unplugged or Windows reboots, repeat:

```powershell
usbipd wsl list
usbipd wsl attach --busid <BUSID> --distribution Ubuntu
```

Then confirm in WSL with `gphoto2 --auto-detect`.

## Troubleshooting

- **`gphoto2: No camera found`**: Re-run `usbipd wsl attach ...`; ensure no other Windows app is using the camera; check that the camera is powered and USB is good.
- **Permission denied** when attaching: PowerShell must be admin.
- **Backend still in mock mode**: Ensure `USE_MOCK_CAMERA=false` in `server/.env` and restart the server.
- **Port conflicts**: Change `PORT` in `server/.env` or `VITE_API_URL` in `client/.env` to match.
- **WSL cannot see USB device after sleep**: Detach/attach again with `usbipd wsl attach ...`.
