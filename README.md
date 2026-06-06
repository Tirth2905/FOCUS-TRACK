# FocusTrack — Productivity Tracker

A Chrome extension + MERN backend for tracking time spent on websites, blocking distractions, and generating daily reports.

---

## Project Structure

```
focustrack/
├── extension/          # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── blocked.html
│   ├── background/
│   │   └── worker.js
│   ├── content/
│   │   └── tracker.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── icons/
└── backend/            # MERN Backend (Express + MongoDB)
    ├── server.js
    ├── .env
    ├── models/
    ├── routes/
    └── middleware/
```

---

## Setup Instructions

### 1. Backend Setup

**Requirements:** Node.js 18+, MongoDB (local or Atlas)

```bash
cd backend
npm install
```

Edit `.env` if needed:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/focustrack
JWT_SECRET=change_this_to_a_strong_secret
```

Start MongoDB (if running locally):
```bash
mongod --dbpath /data/db
# or on macOS with Homebrew:
brew services start mongodb-community
```

Start the backend:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

You should see:
```
✓ MongoDB connected
✓ FocusTrack API running on http://localhost:5000
```

---

### 2. Chrome Extension Setup

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. The FocusTrack icon (◈) will appear in your toolbar

---

## Features

### Extension
- **Time Tracking** — Automatically tracks time on every website
- **Site Blocking** — Block distracting sites (redirects to blocked page)
- **Quick Presets** — One-click block Twitter, Reddit, YouTube, Instagram, etc.
- **Dashboard** — Today's time breakdown with visual bars
- **Weekly Report** — 7-day bar chart + top sites
- **Export** — Download data as CSV or JSON
- **Daily Notifications** — Morning summary of yesterday's usage

### Backend API
- **Auth** — JWT-based register/login
- **Sync** — Upload extension data to server
- **Reports** — Daily, weekly, and 30-day summaries
- **Preferences** — Sync blocked sites and settings across devices

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | ✓ | Current user |
| POST | `/api/tracking/sync` | ✓ | Sync one day |
| POST | `/api/tracking/sync-all` | ✓ | Sync all days |
| GET | `/api/tracking/today` | ✓ | Today's data |
| GET | `/api/tracking/range` | ✓ | Date range data |
| GET | `/api/reports/daily` | ✓ | Daily report |
| GET | `/api/reports/weekly` | ✓ | Weekly report |
| GET | `/api/reports/summary` | ✓ | 30-day summary |
| GET | `/api/preferences` | ✓ | Get preferences |
| PUT | `/api/preferences` | ✓ | Update preferences |
| POST | `/api/preferences/blocked` | ✓ | Add blocked site |
| DELETE | `/api/preferences/blocked/:domain` | ✓ | Remove blocked site |

---

## Usage

### Tracking
The extension automatically tracks time from the moment you load it. Browse normally and open the popup to see today's breakdown.

### Blocking Sites
1. Click the FocusTrack icon
2. Go to the **Block** tab
3. Type a domain or use a Quick Preset
4. Blocked sites will redirect to the blocked page

### Syncing Across Devices
1. Go to the **Account** tab
2. Register or sign in (your backend must be running)
3. Click the **↻** sync button to upload your data
4. Sign in on another device to access your data

### Exporting Reports
1. Go to the **Report** tab
2. Click **Export CSV** or **Export JSON**

---

## Notes

- The extension works fully offline — all data is stored locally in Chrome
- Backend sync is optional and requires the backend to be running
- Blocked sites are enforced locally in the extension (no server needed)
- Data is stored per-day and kept for 30 days locally
