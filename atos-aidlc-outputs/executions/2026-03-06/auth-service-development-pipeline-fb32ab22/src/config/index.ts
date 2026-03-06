import fs from 'fs';
import path from 'path';

function loadKey(filename: string): string {
  const keyPath = process.env[`JWT_${filename.toUpperCase()}_PATH`] 
    || path.join(__dirname, '../../keys', filename);
  
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  
  // Fallback for development
  return process.env[`JWT_${filename.toUpperCase().replace('.', '_')}`] || '';
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    privateKey: loadKey('private.key'),
    publicKey: loadKey('public.key'),
    accessTokenExpiry: '15m',
    accessTokenExpirySeconds: 900,
    issuer: process.env.JWT_ISSUER || 'auth-service',
  },
  
  session: {
    refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days in seconds
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/auth',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  email: {
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    sendgridApiKey: process.env.SENDGRID_API_KEY,
  },
};
