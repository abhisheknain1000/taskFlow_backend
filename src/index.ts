import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';
import { connectDB } from './config/db';

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[SYSTEM] Synapse Engine active on port ${PORT}`);
});