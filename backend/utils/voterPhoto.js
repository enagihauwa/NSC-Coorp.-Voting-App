const path = require('path');
const fs = require('fs');

const ALLOWED_PHOTO_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const MAX_VOTER_PHOTO_BYTES = 2 * 1024 * 1024;

class VoterPhotoError extends Error {}

// Validates and persists a base64 data-URL voter photo. Returns { filename, filePath }
// or null when no photo was provided. Throws VoterPhotoError on invalid input so callers
// can map it to a 400 response.
const saveVoterPhoto = (photo, memberId, prefix = 'voter') => {
  if (!photo) return null;

  const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const matches = photo.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!matches) {
    throw new VoterPhotoError('Invalid voter photo format.');
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
  if (!ALLOWED_PHOTO_EXTENSIONS.has(ext)) {
    throw new VoterPhotoError('Unsupported voter photo type. Use JPG, PNG, or WEBP.');
  }

  const buffer = Buffer.from(matches[2].replace(/\s/g, ''), 'base64');
  if (buffer.length === 0 || buffer.length > MAX_VOTER_PHOTO_BYTES) {
    throw new VoterPhotoError('Voter photo is too large. Maximum allowed size is 2MB.');
  }

  const filename = `${prefix}_${memberId}_${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  return { filename, filePath };
};

module.exports = {
  saveVoterPhoto,
  VoterPhotoError,
  ALLOWED_PHOTO_EXTENSIONS,
  MAX_VOTER_PHOTO_BYTES,
};
