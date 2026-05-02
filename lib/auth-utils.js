import bcrypt from "bcryptjs"

export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, 12)
}

export async function validatePassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash)
}
