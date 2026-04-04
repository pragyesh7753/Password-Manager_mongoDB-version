import { MongoClient } from 'mongodb';
import { DB_NAME, MONGO_URI } from '../config/env.js';

let client;
let db;

export const connectToDatabase = async () => {
  if (db) {
    return db;
  }

  client = new MongoClient(MONGO_URI, {
    maxPoolSize: 20,
  });

  await client.connect();
  db = client.db(DB_NAME);

  await db.collection('passwords').createIndex({ id: 1 }, { unique: true });

  return db;
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database is not initialized. Call connectToDatabase first.');
  }

  return db;
};

export const closeDatabase = async () => {
  if (client) {
    await client.close();
  }

  client = null;
  db = null;
};
