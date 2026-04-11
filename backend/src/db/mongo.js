import { MongoClient } from 'mongodb';
import { DB_NAME, MONGO_URI } from '../config/env.js';

let client;
let db;

const PASSWORDS_COLLECTION = 'passwords';

const PASSWORDS_COLLECTION_SCHEMA = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['id', 'userId', 'name', 'url', 'username', 'passwordEncrypted', 'note', 'createdAt', 'updatedAt'],
    additionalProperties: false,
    properties: {
      _id: {
        bsonType: 'objectId',
      },
      id: {
        bsonType: 'string',
        description: 'Application-level password entry id (UUID string).',
      },
      userId: {
        bsonType: 'string',
        minLength: 1,
        description: 'Clerk user id owner of this password entry.',
      },
      name: {
        bsonType: 'string',
        minLength: 2,
      },
      url: {
        bsonType: 'string',
        minLength: 3,
      },
      username: {
        bsonType: 'string',
        minLength: 1,
      },
      note: {
        bsonType: 'string',
      },
      passwordEncrypted: {
        bsonType: 'object',
        required: ['cipherText', 'iv', 'authTag'],
        additionalProperties: false,
        properties: {
          cipherText: {
            bsonType: 'string',
            minLength: 1,
          },
          iv: {
            bsonType: 'string',
            minLength: 1,
          },
          authTag: {
            bsonType: 'string',
            minLength: 1,
          },
        },
      },
      createdAt: {
        bsonType: 'date',
      },
      updatedAt: {
        bsonType: 'date',
      },
    },
  },
};

const ensurePasswordsCollectionSchema = async () => {
  const existingCollection = await db
    .listCollections({ name: PASSWORDS_COLLECTION }, { nameOnly: true })
    .toArray();

  if (!existingCollection.length) {
    await db.createCollection(PASSWORDS_COLLECTION, {
      validator: PASSWORDS_COLLECTION_SCHEMA,
      validationLevel: 'strict',
      validationAction: 'error',
    });
    return;
  }

  await db.command({
    collMod: PASSWORDS_COLLECTION,
    validator: PASSWORDS_COLLECTION_SCHEMA,
    validationLevel: 'strict',
    validationAction: 'error',
  });
};

const ensurePasswordsCollectionIndexes = async () => {
  const collection = db.collection(PASSWORDS_COLLECTION);
  const indexes = await collection.indexes();

  if (indexes.some((index) => index.name === 'id_1')) {
    await collection.dropIndex('id_1');
  }

  if (indexes.some((index) => index.name === 'userId_1_updatedAt_-1')) {
    await collection.dropIndex('userId_1_updatedAt_-1');
  }

  await collection.createIndex(
    { userId: 1, updatedAt: -1, id: -1 },
    { name: 'userId_1_updatedAt_-1_id_-1' }
  );
  await collection.createIndex({ userId: 1, id: 1 }, { unique: true, name: 'userId_1_id_1' });
};

export const connectToDatabase = async () => {
  if (db) {
    return db;
  }

  client = new MongoClient(MONGO_URI, {
    maxPoolSize: 20,
  });

  await client.connect();
  db = client.db(DB_NAME);

  await ensurePasswordsCollectionSchema();
  await ensurePasswordsCollectionIndexes();

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
