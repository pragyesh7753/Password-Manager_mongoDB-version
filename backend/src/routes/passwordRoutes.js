import crypto from 'node:crypto';
import express from 'express';
import { getAuth } from '@clerk/express';
import { getDb } from '../db/mongo.js';
import { decryptText, encryptText } from '../utils/crypto.js';
import { AppError, asyncHandler } from '../utils/http.js';

const router = express.Router();

const PASSWORDS_COLLECTION = 'passwords';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_IMPORT_ROWS = 2000;

const getAuthenticatedUserId = (req) => {
  const { userId } = getAuth(req);

  if (!userId) {
    throw new AppError(401, 'Authentication required');
  }

  return userId;
};

router.use((req, res, next) => {
  try {
    getAuthenticatedUserId(req);
    next();
  } catch (error) {
    next(error);
  }
});

const generateNameFromUrl = (url) => {
  const normalized = String(url || '').trim();

  if (!normalized) {
    return 'Credential';
  }

  const valueForParsing = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;

  try {
    const parsed = new URL(valueForParsing);
    const host = parsed.hostname.replace(/^www\./i, '');
    return host || normalized;
  } catch {
    return normalized;
  }
};

const isValidEncryptedPayload = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const { cipherText, iv, authTag } = value;

  return (
    typeof cipherText === 'string' &&
    cipherText.length > 0 &&
    typeof iv === 'string' &&
    iv.length > 0 &&
    typeof authTag === 'string' &&
    authTag.length > 0
  );
};

const validatePayload = ({ url, username, password, note, passwordEncryptedClient }) => {
  if (typeof url !== 'string' || url.trim().length < 3) {
    throw new AppError(400, 'url must be at least 3 characters long');
  }

  if (typeof username !== 'string' || username.trim().length < 1) {
    throw new AppError(400, 'username is required');
  }

  const normalizedNote = note === undefined || note === null ? '' : String(note);

  if (isValidEncryptedPayload(passwordEncryptedClient)) {
    return {
      url: url.trim(),
      username: username.trim(),
      note: normalizedNote.trim(),
      passwordEncrypted: {
        cipherText: passwordEncryptedClient.cipherText,
        iv: passwordEncryptedClient.iv,
        authTag: passwordEncryptedClient.authTag,
      },
      encryptionMode: 'client',
    };
  }

  if (typeof password !== 'string' || password.length < 4) {
    throw new AppError(400, 'password (or passwordEncryptedClient) is required');
  }

  return {
    url: url.trim(),
    username: username.trim(),
    note: normalizedNote.trim(),
    passwordEncrypted: encryptText(password),
    encryptionMode: 'server',
  };
};

const parseLimit = (rawLimit) => {
  if (rawLimit === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  const parsed = Number.parseInt(String(rawLimit), 10);

  if (Number.isNaN(parsed)) {
    throw new AppError(400, 'limit must be a valid number');
  }

  return Math.min(Math.max(parsed, 1), MAX_PAGE_SIZE);
};

const decodeCursor = (rawCursor) => {
  if (!rawCursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(String(rawCursor), 'base64url').toString('utf8'));

    if (!parsed.updatedAt || !parsed.id) {
      throw new Error('Invalid cursor');
    }

    const updatedAt = new Date(parsed.updatedAt);

    if (Number.isNaN(updatedAt.getTime())) {
      throw new Error('Invalid cursor date');
    }

    return {
      updatedAt,
      id: String(parsed.id),
    };
  } catch {
    throw new AppError(400, 'Invalid cursor');
  }
};

const encodeCursor = ({ updatedAt, id }) =>
  Buffer.from(
    JSON.stringify({
      updatedAt: updatedAt.toISOString(),
      id,
    })
  ).toString('base64url');

const escapeCsvCell = (value) => {
  const stringValue = String(value ?? '');

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const parseImportEntries = (body) => {
  const entries = body?.entries;

  if (!Array.isArray(entries)) {
    throw new AppError(400, 'entries must be an array');
  }

  if (!entries.length) {
    throw new AppError(400, 'entries must contain at least one row');
  }

  if (entries.length > MAX_IMPORT_ROWS) {
    throw new AppError(400, `Maximum ${MAX_IMPORT_ROWS} entries allowed per import`);
  }

  return entries.map((entry) => validatePayload(entry || {}));
};

const buildCsvRows = (records) =>
  records.map((item) => {
    let password = '';

    if (item.passwordEncrypted) {
      password = decryptText(item.passwordEncrypted);
    } else if (typeof item.password === 'string') {
      password = item.password;
    }

    return [item.name, item.url, item.username, password, item.note || '']
      .map(escapeCsvCell)
      .join(',');
  });

const sendCsvExportResponse = (res, rows) => {
  const csv = ['name,url,username,password,note', ...rows].join('\n');
  const exportDate = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="passop-passwords-${exportDate}.csv"`);
  res.status(200).send(csv);
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const limit = parseLimit(req.query.limit);
    const cursor = decodeCursor(req.query.cursor);
    const collection = getDb().collection(PASSWORDS_COLLECTION);

    const query = { userId };

    if (cursor) {
      query.$or = [
        { updatedAt: { $lt: cursor.updatedAt } },
        { updatedAt: cursor.updatedAt, id: { $lt: cursor.id } },
      ];
    }

    const records = await collection.find(query).sort({ updatedAt: -1, id: -1 }).limit(limit + 1).toArray();

    const hasMore = records.length > limit;
    const page = hasMore ? records.slice(0, limit) : records;

    const items = page.map((item) => ({
        id: item.id,
        name: item.name,
        url: item.url,
        username: item.username,
        note: item.note || '',
        passwordEncrypted: item.passwordEncrypted || null,
        encryptionMode: item.encryptionMode || 'server',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

    const nextCursor = hasMore
      ? encodeCursor({
          updatedAt: page[page.length - 1].updatedAt,
          id: page[page.length - 1].id,
        })
      : null;

    res.json({
      success: true,
      data: {
        items,
        nextCursor,
      },
    });
  })
);

router.get(
  '/export.csv',
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const collection = getDb().collection(PASSWORDS_COLLECTION);
    const records = await collection.find({ userId }).sort({ updatedAt: -1, id: -1 }).toArray();

    if (records.some((item) => item.encryptionMode === 'client')) {
      throw new AppError(
        400,
        'Server export is unavailable for zero-knowledge entries. Use in-app export after unlocking your vault.'
      );
    }

    const rows = buildCsvRows(records);
    sendCsvExportResponse(res, rows);
  })
);

router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const collection = getDb().collection(PASSWORDS_COLLECTION);
    const records = await collection.find({ userId }).sort({ updatedAt: -1, id: -1 }).toArray();

    if (records.some((item) => item.encryptionMode === 'client')) {
      throw new AppError(
        400,
        'Server export is unavailable for zero-knowledge entries. Use in-app export after unlocking your vault.'
      );
    }

    const rows = buildCsvRows(records);
    sendCsvExportResponse(res, rows);
  })
);

router.post(
  '/import',
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const entries = parseImportEntries(req.body || {});
    const collection = getDb().collection(PASSWORDS_COLLECTION);
    const now = new Date();

    const insertDocs = entries.map((entry) => ({
      id: crypto.randomUUID(),
      userId,
      name: generateNameFromUrl(entry.url),
      url: entry.url,
      username: entry.username,
      note: entry.note,
      passwordEncrypted: entry.passwordEncrypted,
      encryptionMode: entry.encryptionMode,
      createdAt: now,
      updatedAt: now,
    }));

    const insertResult = await collection.insertMany(insertDocs, { ordered: false });
    const inserted = insertResult.insertedCount;

    res.status(201).json({
      success: true,
      data: {
        processed: entries.length,
        inserted,
        updated: 0,
      },
    });
  })
);

router.get(
  '/:id/reveal',
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;

    if (!id) {
      throw new AppError(400, 'id is required');
    }

    const collection = getDb().collection(PASSWORDS_COLLECTION);
    const item = await collection.findOne(
      { userId, id },
      { projection: { passwordEncrypted: 1, password: 1, encryptionMode: 1 } }
    );

    if (!item) {
      throw new AppError(404, 'Password entry not found');
    }

    if (item.encryptionMode === 'client') {
      throw new AppError(400, 'Password reveal is unavailable for zero-knowledge entries. Decrypt in the client app.');
    }

    let password = '';

    if (item.passwordEncrypted) {
      password = decryptText(item.passwordEncrypted);
    } else if (typeof item.password === 'string') {
      password = item.password;
    }

    res.json({
      success: true,
      data: {
        id,
        password,
      },
    });
  })
);

router.get(
  '/reveal/:id',
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;

    if (!id) {
      throw new AppError(400, 'id is required');
    }

    const collection = getDb().collection(PASSWORDS_COLLECTION);
    const item = await collection.findOne(
      { userId, id },
      { projection: { passwordEncrypted: 1, password: 1, encryptionMode: 1 } }
    );

    if (!item) {
      throw new AppError(404, 'Password entry not found');
    }

    if (item.encryptionMode === 'client') {
      throw new AppError(400, 'Password reveal is unavailable for zero-knowledge entries. Decrypt in the client app.');
    }

    let password = '';

    if (item.passwordEncrypted) {
      password = decryptText(item.passwordEncrypted);
    } else if (typeof item.password === 'string') {
      password = item.password;
    }

    res.json({
      success: true,
      data: {
        id,
        password,
      },
    });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const payload = validatePayload(req.body || {});
    const id = crypto.randomUUID();
    const now = new Date();

    const passwordEntry = {
      id,
      userId,
      name: generateNameFromUrl(payload.url),
      url: payload.url,
      username: payload.username,
      note: payload.note,
      passwordEncrypted: payload.passwordEncrypted,
      encryptionMode: payload.encryptionMode,
      createdAt: now,
      updatedAt: now,
    };

    const collection = getDb().collection(PASSWORDS_COLLECTION);
    await collection.insertOne(passwordEntry);

    res.status(201).json({
      success: true,
      data: {
        id,
        name: passwordEntry.name,
        url: payload.url,
        username: payload.username,
        note: payload.note,
        encryptionMode: payload.encryptionMode,
      },
    });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;
    if (!id) {
      throw new AppError(400, 'id is required');
    }

    const payload = validatePayload(req.body || {});

    const collection = getDb().collection(PASSWORDS_COLLECTION);
    const updated = await collection.updateOne(
      { userId, id },
      {
        $set: {
          name: generateNameFromUrl(payload.url),
          url: payload.url,
          username: payload.username,
          note: payload.note,
          passwordEncrypted: payload.passwordEncrypted,
          encryptionMode: payload.encryptionMode,
          updatedAt: new Date(),
        },
      }
    );

    if (!updated.matchedCount) {
      throw new AppError(404, 'Password entry not found');
    }

    res.json({
      success: true,
      data: {
        id,
        name: generateNameFromUrl(payload.url),
        url: payload.url,
        username: payload.username,
        note: payload.note,
        encryptionMode: payload.encryptionMode,
      },
    });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;
    if (!id) {
      throw new AppError(400, 'id is required');
    }

    const collection = getDb().collection(PASSWORDS_COLLECTION);
    const deleted = await collection.deleteOne({ userId, id });

    if (!deleted.deletedCount) {
      throw new AppError(404, 'Password entry not found');
    }

    res.json({ success: true, message: 'Password entry deleted' });
  })
);

export default router;
