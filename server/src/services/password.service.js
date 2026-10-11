import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// Compared against when the email doesn't exist, so a failed login
// takes the same time whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', SALT_ROUNDS);

export const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

export const verifyPassword = (password, passwordHash) =>
  bcrypt.compare(password, passwordHash ?? DUMMY_HASH);
