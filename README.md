# Albums-Angular-App

A full-stack web application built with AngularJS 20 (frontend), Express.js (backend), and MongoDB. Designed for performance, scalability, and clean architecture.

## Technologies

**Frontend**
- Angular 20
- RxJS 7.8
- TypeScript 5.3
- Bootstrap

**Backend**
- Node.js 20
- Express.js
- MongoDB + Mongoose
- JWT, dotenv

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/KosioIT/Albums-Angular-App.git
cd Albums-Angular-App

```
### 2. Install the dependencies
From the project root (installs the root tools, the backend and the frontend with the exact versions from the lockfiles):
```bash
npm run install:all
```

### 3. Create environment files

Create a .env file in the backend/ folder with the following code: 
```.env
PORT=3000
MONGO_URI=mongodb://localhost:27017/your-db-name
JWT_SECRET=yourSecretKey
```

For production (`NODE_ENV=production`) the backend reads `backend/.env.production` instead.
Copy `backend/.env.production.example` to `backend/.env.production` and fill in the real values;
the real file is gitignored, so it is never committed.

Create an environment.ts file in the frontend/src/environments folder with the following code:
```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api', // the backend port + /api
};
```

## Sample data

The album scripts live in `backend/db` and need the Firebase service account key
(`backend/src/config/firebase/serviceAccountKey.json`). Run them from the `backend` folder.

```bash
npm run seed:albums -- --check
```
validates `db/albums.data.js` with the same rules as the API, without touching the database.

```bash
npm run seed
```
makes the albums in the database match `db/albums.data.js` (adds and updates them, removes seeded
albums that are no longer listed; likes, listens and downloads are kept) and links each album to its
archive in Cloudflare R2.

### Album downloads (Cloudflare R2)

The archives are kept in a private R2 bucket. A signed-in user gets a link that works for one minute
and downloads the file straight from Cloudflare (no download fees, nothing goes through the server).

1. In Cloudflare create a private bucket and an **Account API token** with *Object Read & Write* on
   that bucket only, then put `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and
   `R2_BUCKET` in `backend/.env` (see `.env.example`).
2. Copy the archives from the Mega folder (`MEGA_ALBUMS_FOLDER_URL` in `backend/.env`, in double
   quotes) into the bucket; files that are already there are skipped:
   ```bash
   npm run r2:upload
   ```
3. Link the albums to the files (`npm run seed` does this too):
   ```bash
   npm run seed:downloads -- --write
   ```
   Files are matched by name: `kill_'em_all.zip` belongs to *Kill 'Em All*.

### Whole songs for signed-in users

Guests hear the 30-second Deezer previews; signed-in users hear the whole songs, streamed from R2.
The songs are taken out of the album archives (only `.zip`) and stored one by one under
`tracks/<album id>/`:

```bash
npm run r2:tracks -- --dry-run
```
shows how the files in each archive match the album's songs on Deezer (by title:
`Welcome To The Jungle - Guns N' Roses.mp3` is *Welcome To The Jungle*); nothing is uploaded.

```bash
npm run r2:tracks
```
uploads the songs of every album that has none yet (`--album=<id>` for one album, `--force` to redo
them). Files that match no song are listed and skipped; songs without a file stay previews.

The biggest image in the archive is kept as the album's cover (`tracks/<album id>/cover.jpg`).

### Uploading songs from the admin pages

Admins add an album's songs on its **Songs** page (*Manage albums → Songs*, and right after
*Add album*): choose the MP3s (and a cover image), check which song each file is (they are matched by
title, the rest is picked from the list) and upload. The browser sends the files straight to R2, so the
bucket needs a CORS rule. In Cloudflare: *R2 → your bucket → Settings → CORS Policy → Add CORS policy*:

```json
[
  {
    "AllowedOrigins": ["http://localhost:4200"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```
(add the address of the deployed site to `AllowedOrigins` when there is one). Songs replaced or
deleted there are removed from R2 too, and deleting an album removes all of its files.

The songs are linked to the album's tracks on Deezer, so an album that Deezer does not have cannot get
songs.

### How album downloads are made

Album downloads are packed from these files: the first download of an album makes
`downloads/<album id>.zip` in R2 (songs numbered in album order, plus the cover), later downloads get a
link to that file. When the songs or the cover change, the next download packs the album again.
Signed-in users can also download single songs from the player's track list.

Once an album's songs are stored, its original archive is just a second copy:

```bash
npm run r2:cleanup
```
lists those archives and how much space they take; `npm run r2:cleanup -- --delete` removes them.

## MongoDB Setup
This project uses MongoDB as its database. To run it locally:

1.Download and install MongoDB Community Server from https://www.mongodb.com/try/download/community.
<br>2. During installation, choose the Complete setup and enable MongoDB as a Windows Service.
<br>3. MongoDB will run on port 27017 by default.

To start MongoDB manually enter 'mongod' in the terminal

Tip: You can use the 'mongo' command to test the connection.

## Running the App

### MongoDB server
```cmd
mongod
```

### Backend and frontend together
From the project root, in one terminal:
```bash
npm run dev
```
The backend (`api`, port 3000) and the frontend (`web`, http://localhost:4200) run side by side with prefixed logs.

### Only one of them
```bash
npm run dev:backend
```
```bash
npm run dev:frontend
```

### After pulling new changes
From the project root (stop a running `npm run dev` with Ctrl+C first):

```bash
npm run update
```
pulls the latest code, reinstalls the dependencies, updates the albums and their Mega download links
(`npm run seed`) and starts both servers.

```bash
npm run pull
```
only pulls the latest code and starts both servers (no reinstall, no database changes).

```bash
npm run refresh
```
does the same without `git pull` and the reinstall: updates the albums and starts the servers.

### Other scripts
- `npm run seed` makes the albums in the database match `backend/db/albums.data.js` (adds, updates,
  removes the seeded albums that are no longer listed; likes, listens and downloads are kept), then
  links the archives from the Mega folder when `MEGA_ALBUMS_FOLDER_URL` is set
- `npm run build` builds the frontend for production
- `npm test` runs the frontend unit tests once
