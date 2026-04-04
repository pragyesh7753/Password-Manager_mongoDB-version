import crypto from 'node:crypto';
import express from 'express';
import { getDb } from '../db/mongo.js';
import { decryptText, encryptText } from '../utils/crypto.js';
import { AppError, asyncHandler } from '../utils/http.js';

const router = express.Router();

const validatePayload = ({ site, username, password }) => {
  if (typeof site !== 'string' || site.trim().length < 3) {
    throw new AppError(400, 'site must be at least 3 characters long');
  }

  if (typeof username !== 'string' || username.trim().length < 3) {
    throw new AppError(400, 'username must be at least 3 characters long');
  }

  if (typeof password !== 'string' || password.length < 4) {
    throw new AppError(400, 'password must be at least 4 characters long');
  }

  return {
    site: site.trim(),
    username: username.trim(),
    password,
  };
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const collection = getDb().collection('passwords');
    const records = await collection.find({}).sort({ updatedAt: -1 }).toArray();

    const data = records.map((item) => {
      let password = '';

      if (item.passwordEncrypted) {
        password = decryptText(item.passwordEncrypted);
      } else if (typeof item.password === 'string') {
        password = item.password;
      }

      return {
        id: item.id,
        site: item.site,
        username: item.username,
        password,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    res.json({ success: true, data });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = validatePayload(req.body || {});
    const id = req.body.id || crypto.randomUUID();
    const now = new Date();

    const doc = {
      id,
      site: payload.site,
      username: payload.username,
      passwordEncrypted: encryptText(payload.password),
      createdAt: now,
      updatedAt: now,
    };

    const collection = getDb().collection('passwords');
    await collection.insertOne(doc);

    res.status(201).json({
      success: true,
      data: {
        id: doc.id,
        site: doc.site,
        username: doc.username,
        password: payload.password,
      },
    });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) {
      throw new AppError(400, 'id is required');
    }

    const payload = validatePayload(req.body || {});

    const collection = getDb().collection('passwords');
    const updated = await collection.updateOne(
      { id },
      {
        $set: {
          site: payload.site,
          username: payload.username,
          passwordEncrypted: encryptText(payload.password),
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
        site: payload.site,
        username: payload.username,
        password: payload.password,
      },
    });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) {
      throw new AppError(400, 'id is required');
    }

    const collection = getDb().collection('passwords');
    const deleted = await collection.deleteOne({ id });

    if (!deleted.deletedCount) {
      throw new AppError(404, 'Password entry not found');
    }

    res.json({ success: true, message: 'Password entry deleted' });
  })
);

export default router;
