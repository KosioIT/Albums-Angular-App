import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import albumsRouter from './routes/albumRoutes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);

// Albums routes
app.use('/api/albums', albumsRouter);

// Test route
app.get('/', (_req, res) => res.send('API is running...'));

export default app;
