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

Create an environment.ts file in the frontend/src/environments folder with the following code:
```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api', // the backend port + /api
};
```

## Sample data

The album seed scripts live in `backend/db` and need the Firebase service account key
(`backend/src/config/firebase/serviceAccountKey.json`). Run them from the `backend` folder:

```bash
npm run seed:albums -- --check
```
validates `db/albums.data.js` with the same rules as the API, without touching the database.

```bash
npm run seed:albums
```
adds the albums that are missing (existing ones are skipped; `-- --force` updates their metadata
but keeps likes, listens, downloads and download links).

```bash
npm run seed:downloads
```
matches the archives in the Mega folder from `MEGA_ALBUMS_FOLDER_URL` (backend `.env`, in double quotes because of the `#`) to albums
and shows the result; add `-- --write` to save the links (`-- --write --overwrite` replaces existing ones).

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

### Other scripts
- `npm run build` builds the frontend for production
- `npm test` runs the frontend unit tests once
