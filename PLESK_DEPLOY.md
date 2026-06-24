# Plesk / IISNode Deployment Guide

## Root Cause of the Error

The error:
```
Error [ERR_REQUIRE_ASYNC_MODULE]: require() cannot be used on an ESM graph
with top-level await. Use import() instead.
```

was caused by two things working against each other:

1. **`server/package.json` has `"type": "module"`**, which makes every `.js` file in the server folder an ES Module (ESM).
2. **`server/seed.js` used a top-level `await`** (i.e., an `await` at the root of the file, not inside a function). This is valid ESM syntax, but it makes the entire ESM graph "async".
3. **IISNode's `interceptor.js` uses `require()`** to load the entry point. CJS `require()` cannot load an async ESM graph — hence the crash.

## Fix Applied

In `server/seed.js`, the top-level `await` was wrapped in an `async` IIFE:

```js
// BEFORE (broken):
if (process.argv.includes('--force')) {
  const { seedIfEmpty } = await import('./db.js')   // ← top-level await!
  ...
}

// AFTER (fixed):
if (process.argv.includes('--force')) {
  ;(async () => {
    const { seedIfEmpty } = await import('./db.js')
    ...
  })()
}
```

A `server/web.config` was also added for IISNode routing.

---

## Deployment Steps

### 1. Build the React client locally (or on the server)

```bash
# From the project root
npm run build
```

This produces `client/dist/` — the compiled frontend files.

### 2. Upload files to Plesk

Upload the following to your domain's `httpdocs` folder (e.g. `E:\Inetpub\vhosts\demo.datainmeta.com\httpdocs`):

```
httpdocs/
├── server/
│   ├── index.js
│   ├── db.js
│   ├── auth.js
│   ├── seed.js          ← contains the fix
│   ├── validation.js
│   ├── package.json
│   ├── web.config       ← NEW FILE, required for IISNode
│   └── node_modules/    ← install here (see step 3)
└── client/
    └── dist/            ← built React app
```

> **Important:** The `web.config` must be placed inside the `server/` folder, which is the folder Plesk points the Node.js application at.

### 3. Install server dependencies

In the Plesk File Manager terminal, or via SSH, run:

```bash
cd httpdocs/server
npm install --omit=dev
```

### 4. Configure the Node.js app in Plesk

In Plesk → your domain → **Node.js**:

| Setting | Value |
|---|---|
| Document root | `/httpdocs/server` |
| Application startup file | `index.js` |
| Node.js version | 18.x or higher |
| Application mode | Production |

Click **Enable Node.js** / **Restart** to apply.

### 5. Set environment variables (optional)

In Plesk → Node.js → Environment Variables:

| Variable | Example Value | Purpose |
|---|---|---|
| `PORT` | `4000` | Port the app listens on (IISNode proxies to this) |
| `JWT_SECRET` | `change-me-to-a-random-string` | Signs authentication tokens |
| `DB_PATH` | `E:\Inetpub\vhosts\...\httpdocs\server\flcbudget.db` | SQLite database file location |

### 6. Verify

Visit your domain. The React frontend is served by the Express app from `client/dist/`. The API is available at `/api/...`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ERR_REQUIRE_ASYNC_MODULE` | Make sure you uploaded the fixed `seed.js` |
| 500 on all routes | Check IISNode logs in `server/iisnode/` |
| API returns 404 but frontend loads | Confirm `client/dist/` was built and is present |
| Database errors on first run | The app auto-creates and seeds the SQLite DB on first start |
| `JWT_SECRET` related errors | Set the env variable in Plesk's Node.js panel |
