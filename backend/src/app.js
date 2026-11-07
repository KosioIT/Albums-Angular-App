import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import albumsRoutes from './routes/albumRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import cookieParser from 'cookie-parser';

const app = express();

// CORS: an explicit origin list is required, because the refresh cookie makes the requests credentialed
app.use(cors({
  origin: (process.env.CLIENT_ORIGIN || 'http://localhost:4200').split(','),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Auth routes (register, login, password reset)
app.use('/api/auth', authRoutes);

// User routes (CRUD operations)
app.use('/api/users', userRoutes);

// Albums routes
app.use('/api/albums', albumsRoutes);

// Favorites routes
app.use('/api/favorites', favoriteRoutes);

// Test route
app.get('/', (_req, res) => res.send('API is running...'));

export default app;
