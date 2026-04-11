import dotenv from 'dotenv';

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV;
export const PORT = Number(process.env.PORT);
export const SERVER_URL = process.env.SERVER_URL;
export const MONGO_URI = process.env.MONGO_URI;
export const DB_NAME = process.env.DB_NAME;
export const CORS_ORIGIN = process.env.CORS_ORIGIN;
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
export const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required.');
}

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is required and must be 64 hex characters.');
}

if (!/^[a-fA-F0-9]{64}$/.test(ENCRYPTION_KEY)) {
  throw new Error('Invalid ENCRYPTION_KEY. Expected 64 hex characters for AES-256.');
}
