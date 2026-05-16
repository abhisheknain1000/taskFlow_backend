  import mongoose from 'mongoose';

  function getMongoUri(): string | undefined {
    const raw = process.env.MONGO_URI ?? process.env.MONGODB_URI;
    if (raw == null || typeof raw !== 'string') return undefined;
    const uri = raw.trim();
    return uri.length > 0 ? uri : undefined;
  }

  export const connectDB = async () => {
    const uri = getMongoUri();
    if (!uri) {
      console.error(
        'db not connect yet'
      );
      process.exit(1);
    }

    try {
      const conn = await mongoose.connect(uri);
      console.log(`db is connected to: ${conn.connection.host}`);
    } catch (error) {
      console.error(` Database connection failed: ${error}`);
      process.exit(1);
    }
  };