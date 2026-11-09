# Serendipity

Serendipity is a browser-based community app prototype. It brings a social feed, document sharing, book recommendations, user profiles, direct messages, a daily-points activity, and a small merchandise market together in one responsive interface.

## Project status

This is a **front-end demo, not a production service**. There is currently no API, database, or implemented backend. The main app uses sample data embedded in `frontend/index.html` and saves most user-created or user-specific changes in the current browser's `localStorage`. That means the data is local to that browser and can be cleared or edited by the user; it is not shared across devices.

The sign-in screen is simulated: any username with the demo password `123` can sign in or create a local profile. It does not provide real authentication or account security. Checkout is also a UI demonstration and does not process a payment. Uploaded documents and images are kept in browser storage rather than sent to a server.

## Run locally

Serve the `frontend/` directory over HTTP; opening `index.html` directly as a file may prevent browser features such as storage and file downloads from behaving as expected.

From the repository root, on Windows PowerShell:

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts/run_server.ps1
```

Or, on any platform with Python 3:

```sh
cd frontend
python -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000>. Stop the server with `Ctrl+C`.

## Features

- **Home and feed:** community posts, likes, comments, image previews, and creating posts.
- **Documents:** sample documents, local uploads/downloads, and threaded comments.
- **Recommendations:** submit and vote on reading recommendations, save a book list, and view weekly podium/highlight features.
- **Profiles:** demo sign-in, profile editing, points, levels, badges, preferences, and profile views.
- **Search and messaging:** search local profiles and send browser-stored direct messages with unread indicators.
- **Daily Bonus:** a seven-day points streak stored per local profile.
- **Market:** browse sample merchandise, manage a cart and wishlist, and try the demo SerePoints discount flow.
- **Admin demo:** the username `admin` exposes local user/product and points-management controls. This is not a protected admin system.

## Repository layout

```text
frontend/                 Static web application
  assets/                 Product and profile images
  data/data.json          Sample dataset used by the legacy script.js prototype
  index.html              Main page and its current demo data (window.appData)
  js/                     Browser-side scripts
  styles.css              Application styles
  tools/reset-points.html Local browser-storage points reset utility
  archive/                Historical backup files; not loaded by the app
backend/                  Reserved for a future API/backend; none is implemented yet
scripts/run_server.ps1    Starts Python's local static HTTP server
```

## JavaScript and utility inventory

| File | Status | Responsibility |
| --- | --- | --- |
| `frontend/js/app.js` | **Active; main controller** | Renders and switches app sections, handles demo sign-in/profile editing and admin controls, and manages feed/document interactions, points history, levels, badges, preferences, and other shared behavior. |
| `frontend/js/home.js` | Active | Renders the landing page, featured products, navigation shortcuts, and contact form. |
| `frontend/js/recommendations.js` | Active | Renders book recommendations; handles submissions, voting, bookmarks, weekly podiums, highlights, and related points awards. |
| `frontend/js/search.js` | Active | Filters local users and opens profile previews; can hand off to messaging. |
| `frontend/js/mensajeria.js` | Active | Renders local conversations, sends/deletes messages, tracks read state, and updates unread badges. |
| `frontend/js/dailybonus.js` | Active | Implements the per-user weekly bonus streak, claim countdown, and points rewards. |
| `frontend/js/market.js` | Active | Renders products; handles cart, wishlist, SerePoints discounts, demo checkout, and admin product actions. |
| `frontend/js/feed.js` | Dormant helper | Small standalone feed renderer from an earlier implementation. The current feed is rendered in `app.js`; this helper is included by the page but is not called by the current controller. |
| `frontend/js/docs.js` | Dormant helper | Earlier document-list/thread renderer. Current document behavior is in `app.js`; this helper is included but not called by the current controller. |
| `frontend/js/perfil.js` | Dormant helper | Earlier profile markup and an empty listener initializer. Current profile behavior is in `app.js`; this helper is included but not called by the current controller. |
| `frontend/js/index.js` | Legacy prototype | Earlier button-based section navigation; not included by the current page. |
| `frontend/js/script.js` | Legacy prototype | Alternate app implementation that fetches `data/data.json`; not included by the current page. |
| `frontend/tools/reset-points.html` | Manual utility | Sets SerePoints to zero for profiles stored in the same browser origin. Use only when intentionally clearing demo points. |
| `scripts/run_server.ps1` | Development utility | Serves `frontend/` on `localhost:8000` using Python's built-in HTTP server. |

`frontend/data/data.json` is sample data for the legacy prototype. The current app instead reads its initial demo dataset from the `window.appData` object embedded in `frontend/index.html`.

The `frontend/archive/` files (`app.js.bak` and `styles.css.bak2`) are backups only; they are not referenced by the application.

## Backend status

There is no backend implementation yet. `backend/README.md` records that status and reserves the directory for future server/API code. Until a backend is added, authentication, user content, points, messages, and commerce remain browser-local demo behavior.
