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

### Clone the repository

```bash
git clone https://github.com/KosioIT/Albums-Angular-App.git

### Install the dependencies

cd frontend
npm install

cd ../backend
npm install

### Create environment files

#### Create a .env file in the backend/ folder
PORT=3000
MONGO_URI=mongodb://localhost:27017/your-db-name
JWT_SECRET=yourSecretKey

#### Create a environment.ts file in the frontend/environments folder
apiUrl: 'http://localhost:4000/api'

## MongoDB Setup
This project uses MongoDB as its database. To run it locally:

Download and install MongoDB Community Server from https://www.mongodb.com/try/download/community.

During installation, choose the Complete setup and enable MongoDB as a Windows Service.

MongoDB will run on port 27017 by default.

To start MongoDB manually enter 'mongod' in the terminal

You can use the 'mongo' command to test the connection.

## Running the App

### MongoDB
mognod

### Backend
cd backend
npm run dev

### Frontend
cd frontend
ng serve
