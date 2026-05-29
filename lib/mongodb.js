import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI;
const DEFAULT_TIMEOUT_MS = 8000;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

function readTimeout(name) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function enhanceMongoError(error) {
  const isSrvTxtTimeout =
    MONGODB_URI.startsWith("mongodb+srv://") &&
    error?.code === "ETIMEOUT" &&
    error?.syscall === "queryTxt";

  if (!isSrvTxtTimeout) {
    return error;
  }

  const message = [
    `MongoDB Atlas DNS TXT lookup timed out for ${error.hostname}.`,
    "Your network/DNS server is blocking or timing out mongodb+srv TXT lookups.",
    "Use MONGODB_DIRECT_URI with a standard mongodb:// Atlas seed-list URI, switch DNS, or use a local MongoDB URI.",
  ].join(" ");

  return new Error(message, { cause: error });
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: readTimeout(
          "MONGODB_SERVER_SELECTION_TIMEOUT_MS",
        ),
        connectTimeoutMS: readTimeout("MONGODB_CONNECT_TIMEOUT_MS"),
      })
      .then((mongoose) => {
        return mongoose;
      })
      .catch((error) => {
        cached.promise = null;
        throw enhanceMongoError(error);
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
