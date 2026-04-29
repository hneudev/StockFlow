import mongoose from "mongoose";
import { env } from "@/lib/env";

// Cache global para reutilizar la conexión entre hot reloads en desarrollo
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

const cache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cache;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(env.MONGODB_URI, { bufferCommands: false });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
