import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { globalErrorHandler } from './middlewares/errorMiddleware';
import { AppError } from './utils/AppError';

// Routes imports
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';


const app = express();

app.use(helmet()); 

app.use(
  cors({

    origin: [
      "http://localhost:3000",  
      "https://taskflow-ten-delta.vercel.app",
    ],

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

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});    

// 4. GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

export default app;