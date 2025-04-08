const crypto = require('crypto');

// Fonction pour dériver une clé de 32 octets à partir de la clé d'environnement
function deriveKey(key) {
  return crypto.createHash('sha256').update(String(key)).digest();
}

// Fonction pour chiffrer une chaîne
function encrypt(text) {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY non définie');
  }

  const key = deriveKey(process.env.ENCRYPTION_KEY);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// Fonction pour déchiffrer une chaîne
function decrypt(encryptedData) {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY non définie');
  }

  const key = deriveKey(process.env.ENCRYPTION_KEY);
  const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = {
  encrypt,
  decrypt
}; 