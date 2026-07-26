import mongoose from 'mongoose';
import dns from 'dns';

// Ensure Node's DNS resolver prefers IPv4 for MongoDB SRV resolution
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore if unsupported in environment
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = (global as any).mongooseCache || { conn: null, promise: null };
if (!(global as any).mongooseCache) {
  (global as any).mongooseCache = cached;
}

export async function dbConnect(): Promise<typeof mongoose> {
  const uri = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tuition_center').trim();

  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

