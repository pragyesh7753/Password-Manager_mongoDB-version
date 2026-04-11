const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const PBKDF2_ITERATIONS = 210000;
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;
const VAULT_VERIFIER_TEXT = 'passop-vault-verifier-v1';

const toBase64 = (bytes) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value) => {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const mergeBytes = (left, right) => {
  const merged = new Uint8Array(left.length + right.length);
  merged.set(left, 0);
  merged.set(right, left.length);
  return merged;
};

export const deriveVaultKey = async ({ masterPassword, userId }) => {
  const normalizedPassword = String(masterPassword || '');
  const normalizedUserId = String(userId || '');

  if (!normalizedPassword) {
    throw new Error('Master password is required.');
  }

  if (!normalizedUserId) {
    throw new Error('User id is required to derive the vault key.');
  }

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(normalizedPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: textEncoder.encode(`passop-vault:${normalizedUserId}`),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptWithVaultKey = async ({ plainText, key }) => {
  if (!key) {
    throw new Error('Vault key is not available.');
  }

  const iv = window.crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    textEncoder.encode(String(plainText || ''))
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const cipherText = encryptedBytes.slice(0, encryptedBytes.length - AES_GCM_TAG_BYTES);
  const authTag = encryptedBytes.slice(encryptedBytes.length - AES_GCM_TAG_BYTES);

  return {
    cipherText: toBase64(cipherText),
    iv: toBase64(iv),
    authTag: toBase64(authTag),
  };
};

export const decryptWithVaultKey = async ({ encryptedPayload, key }) => {
  if (!key) {
    throw new Error('Vault key is not available.');
  }

  const cipherText = fromBase64(encryptedPayload?.cipherText);
  const iv = fromBase64(encryptedPayload?.iv);
  const authTag = fromBase64(encryptedPayload?.authTag);

  const encryptedBytes = mergeBytes(cipherText, authTag);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encryptedBytes
  );

  return textDecoder.decode(decryptedBuffer);
};

export const createVaultVerifier = async ({ key }) =>
  encryptWithVaultKey({
    plainText: VAULT_VERIFIER_TEXT,
    key,
  });

export const verifyVaultVerifier = async ({ verifier, key }) => {
  if (!verifier) {
    return false;
  }

  try {
    const decoded = await decryptWithVaultKey({
      encryptedPayload: verifier,
      key,
    });

    return decoded === VAULT_VERIFIER_TEXT;
  } catch {
    return false;
  }
};
