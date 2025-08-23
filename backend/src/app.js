import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import albumsRoutes from './routes/albumRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);

// Albums routes
app.use('/api/albums', albumsRoutes);

// Favorites routes
app.use('/api/favorites', favoriteRoutes);

// Test route
app.get('/', (_req, res) => res.send('API is running...'));

export default app;
