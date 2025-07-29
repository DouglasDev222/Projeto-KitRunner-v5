import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'kitrunner-super-secret-key-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JWTPayload {
  adminUserId: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class JWTUtils {
  static generateToken(adminUserId: number, username: string, role: string): string {
    const payload: JWTPayload = {
      adminUserId,
      username,
      role,
    };

    const options: SignOptions = {
      expiresIn: JWT_EXPIRES_IN,
    };

    return jwt.sign(payload, JWT_SECRET, options);
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  static generateTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static isTokenExpired(exp: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    return now >= exp;
  }
}