import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { globalErrorHandler } from './middlewares/errorMiddleware';
import { AppError } from './utils/AppError';
import { getAllowedOrigins } from './config/cors';

// Routes imports
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import projectRoutes from './routes/projectRoutes';
import userRoutes from './routes/userRoutes';


const app = express();

app.use(helmet()); 

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  })
);


app.use(express.json({ limit: '10kb' }));


if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`🚀 [${req.method}] ${req.url}`);
  
    if (req.method !== 'GET') console.log("📦 Body:", req.body);
    next();
  });
}

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/users', userRoutes);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});    

// 4. GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

export default app;