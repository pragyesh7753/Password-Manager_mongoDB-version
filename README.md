# PassOP - Password Manager (MongoDB + Clerk)

A full-stack password manager with user authentication, per-user data isolation, responsive UI, CSV import/export, and a client-side vault encryption model.

## Overview

PassOP lets each authenticated user manage credentials securely:

- Clerk-based authentication (custom UI, no Clerk prebuilt pages)
- User-scoped password storage and retrieval
- Responsive dashboard for desktop, tablet, and mobile
- CSV import/export with skipped-row diagnostics and fix dialog
- Optional zero-knowledge style vault behavior for client-encrypted entries

## Key Features

- Custom sign up and sign in flow using Clerk SDK
- Strict per-user access control on backend routes
- Password list with pagination and manual refresh
- Add and edit through modal dialogs
- Copy, edit, delete actions with icon controls
- Import workflow with row-level validation and repair dialog
- Download failed import rows as CSV
- Export passwords as CSV
- Master password vault unlock flow with confirm password on first setup
- First-time warning that forgotten master password cannot be recovered

## Tech Stack

Frontend:

- React 19
- Vite 8
- Tailwind CSS 4
- Clerk React SDK
- React Toastify
- Papa Parse

Backend:

- Node.js (ES modules)
- Express 5
- MongoDB Node driver
- Clerk Express SDK
- Helmet, CORS, rate limiting, Morgan

## Project Structure

- backend
  - server.js
  - src/app.js
  - src/routes/passwordRoutes.js
  - src/db/mongo.js
  - src/utils/crypto.js
- frontend
  - src/App.jsx
  - src/components
  - src/lib/api.js
  - src/lib/vaultCrypto.js

## Security Model

### 1) Authentication and Authorization

- All password routes require authenticated Clerk user context
- Data queries are always scoped by userId

### 2) Encryption

Two encryption modes currently coexist:

- client mode (recommended):
  - Password is encrypted in browser using Web Crypto
  - Server stores ciphertext only and cannot reveal plaintext for these entries
- server mode (legacy compatibility):
  - Server can encrypt and decrypt using backend ENCRYPTION_KEY

### 3) Master Password

- User unlocks vault in browser with master password
- First-time setup asks for confirm password
- First-time setup shows irreversible recovery warning
- If master password is forgotten, client-encrypted entries are not recoverable

## Prerequisites

- Node.js 18+
- MongoDB running locally or remotely
- Clerk application (publishable key and secret key)

## Environment Variables

### Backend: backend/.env

Use backend/.env.example as template:

- NODE_ENV=development
- PORT=3000
- SERVER_URL=http://localhost:3000
- MONGO_URI=mongodb://localhost:27017
- DB_NAME=passop
- CORS_ORIGIN=http://localhost:5173
- ENCRYPTION_KEY=<64 hex chars>
- CLERK_SECRET_KEY=<your clerk secret key>

### Frontend: frontend/.env

Use frontend/.env.example as template:

- VITE_API_BASE_URL=http://localhost:3000
- VITE_CLERK_PUBLISHABLE_KEY=<your clerk publishable key>

## Local Setup

1. Install backend dependencies

- cd backend
- npm install

2. Install frontend dependencies

- cd ../frontend
- npm install

3. Configure environment files

- Create backend/.env
- Create frontend/.env

4. Run backend

- cd ../backend
- npm run dev

5. Run frontend

- cd ../frontend
- npm run dev

6. Open app

- http://localhost:5173

## Scripts

Backend:

- npm run dev
- npm start
- npm run lint

Frontend:

- npm run dev
- npm run build
- npm run preview
- npm run lint

## API Overview

Base path: /api/passwords

- GET /api/passwords
  - paginated list by user
- POST /api/passwords
  - create entry
- PUT /api/passwords/:id
  - update entry
- DELETE /api/passwords/:id
  - delete entry
- GET /api/passwords/:id/reveal
  - reveal password for legacy/server-encrypted entries
- POST /api/passwords/import
  - bulk import entries
- GET /api/passwords/export.csv
  - server-side export for compatible entries

Health endpoint:

- GET /api/health

## CSV Import and Export

Supported fields:

- name (generated from URL on backend)
- url
- username
- password
- note

Import behavior:

- Valid rows are imported
- Invalid rows are skipped
- App shows exact skipped row and missing fields
- You can fix rows in dialog and retry import
- You can download failed rows as CSV

## Responsive Behavior

- Mobile: password entries render as cards
- Tablet/Desktop: table view with sticky structure and internal list scrolling
- Dialogs adapt for short-height screens with internal scroll

## Troubleshooting

1. Received HTML instead of JSON

- Check frontend VITE_API_BASE_URL
- Ensure backend is running

2. CORS errors

- Confirm backend CORS_ORIGIN matches frontend origin

3. Unlock accepts wrong password

- Ensure you are on latest build
- Vault verifier is used to validate master password

4. Cannot reveal password

- Client-encrypted entries cannot be revealed by backend
- Unlock vault in frontend and use in-app operations

5. npm ENOENT at workspace root

- Run npm commands inside backend or frontend directories, not repository root

## Notes

- This repository currently includes migration-compatible behavior for older entries.
- For strongest privacy posture, use client-encrypted mode for all active entries.

## License

ISC (see package metadata)
