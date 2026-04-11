import Papa from 'papaparse';

export const parseCsvFile = (file) =>
  new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => String(header || '').replace(/^\uFEFF/, '').trim().toLowerCase(),
      complete: (results) => resolve(results.data || []),
      error: (error) => reject(error),
    });
  });

const normalizeCsvObject = (row) =>
  Object.fromEntries(
    Object.entries(row || {}).map(([key, value]) => [
      String(key || '').replace(/^\uFEFF/, '').trim().toLowerCase(),
      typeof value === 'string' ? value.trim() : value,
    ])
  );

const expandCollapsedCsvRow = (normalized) => {
  const keys = Object.keys(normalized);

  if (keys.length !== 1) {
    return normalized;
  }

  const collapsedHeader = keys[0];
  const collapsedValue = String(normalized[collapsedHeader] || '');
  const delimiter = collapsedHeader.includes(';')
    ? ';'
    : collapsedHeader.includes('\t')
      ? '\t'
      : collapsedHeader.includes(',')
        ? ','
        : null;

  if (!delimiter) {
    return normalized;
  }

  const reparsed = Papa.parse(`${collapsedHeader}\n${collapsedValue}`, {
    header: true,
    delimiter,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => String(header || '').replace(/^\uFEFF/, '').trim().toLowerCase(),
  });

  return normalizeCsvObject(reparsed.data?.[0] || normalized);
};

const pickFirstNonEmpty = (source, keys) => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return '';
};

export const normalizeImportRow = (row, index) => {
  const normalized = expandCollapsedCsvRow(normalizeCsvObject(row));

  const url = pickFirstNonEmpty(normalized, ['url', 'website', 'origin', 'login_url']);
  const username = pickFirstNonEmpty(normalized, ['username', 'user', 'username_value', 'usernamevalue']);
  const password = pickFirstNonEmpty(normalized, ['password', 'password_value', 'passwordvalue']);
  const note = pickFirstNonEmpty(normalized, ['note', 'notes', 'comment', 'comments']);
  const draft = { url, username, password, note };

  const missingFields = [];
  if (!url) missingFields.push('url');
  if (!username) missingFields.push('username');
  if (!password) missingFields.push('password');

  if (missingFields.length > 0) {
    return {
      entry: null,
      error: {
        rowNumber: index + 2,
        missingFields,
        message: `Row ${index + 2} skipped: missing ${missingFields.join(', ')}`,
      },
      draft,
    };
  }

  return {
    entry: draft,
    error: null,
    draft,
  };
};

export const normalizeUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '#';
  }

  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(url).toString();
  } catch {
    return '#';
  }
};

export const getValidationMessage = (form) => {
  if (form.url.trim().length < 4) return 'Website URL must be at least 4 characters.';
  if (form.username.trim().length < 1) return 'Username is required.';
  if (form.password.length < 4) return 'Password must be at least 4 characters.';
  return '';
};

export const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
};

export const getPasswordStrength = (password) => {
  const value = String(password || '');
  if (!value) {
    return {
      label: 'No password',
      badgeClass: 'bg-slate-100 text-slate-600',
      barClass: 'bg-slate-300',
      score: 0,
    };
  }

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) {
    return {
      label: 'Weak',
      badgeClass: 'bg-red-100 text-red-700',
      barClass: 'bg-red-500',
      score,
    };
  }

  if (score <= 2) {
    return {
      label: 'Fair',
      badgeClass: 'bg-amber-100 text-amber-700',
      barClass: 'bg-amber-500',
      score,
    };
  }

  if (score <= 3) {
    return {
      label: 'Good',
      badgeClass: 'bg-lime-100 text-lime-700',
      barClass: 'bg-lime-500',
      score,
    };
  }

  return {
    label: score === 5 ? 'Very Strong' : 'Strong',
    badgeClass: 'bg-green-100 text-green-700',
    barClass: 'bg-green-600',
    score,
  };
};

export const downloadImportIssueRowsCsv = (rows) => {
  const csvRows = rows.map((row) => ({
    row_number: row.rowNumber,
    reason: row.message,
    missing_fields: row.missingFields.join(', '),
    url: row.draft.url,
    username: row.draft.username,
    password: row.draft.password,
    note: row.draft.note,
  }));

  const csv = Papa.unparse(csvRows, {
    columns: ['row_number', 'reason', 'missing_fields', 'url', 'username', 'password', 'note'],
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `passop-import-issues-${dateStamp}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
};
