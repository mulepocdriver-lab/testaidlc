import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { SessionService } from './session.service';
import { AuditService } from './audit.service';
import { config } from '../config';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
  mfaCode?: string;
}

export class AuthService {
  private sessionService: SessionService;
  private auditService: AuditService;

  constructor() {
    this.sessionService = new SessionService();
    this.auditService = new AuditService();
  }

  async register(dto: RegisterDto): Promise<User> {
    const existingUser = await User.findByEmail(dto.email);
    if (existingUser) {
      throw new Error('USER_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    
    const user = await User.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      name: dto.name,
      status: 'pending_verification',
      createdAt: new Date(),
    });

    await this.auditService.log({
      action: 'USER_REGISTERED',
      userId: user.id,
      metadata: { email: dto.email },
    });

    await this.sendVerificationEmail(user);
    
    return user;
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await User.findByEmail(dto.email.toLowerCase());
    
    if (!user) {
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        metadata: { email: dto.email, reason: 'USER_NOT_FOUND' },
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValidPassword) {
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        userId: user.id,
        metadata: { reason: 'INVALID_PASSWORD' },
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    if (user.mfaEnabled && !dto.mfaCode) {
      return { accessToken: '', refreshToken: '', expiresIn: 0 };
    }

    if (user.mfaEnabled && dto.mfaCode) {
      const isValidMfa = await this.verifyMfaCode(user.id, dto.mfaCode);
      if (!isValidMfa) {
        throw new Error('INVALID_MFA_CODE');
      }
    }

    const tokens = await this.generateTokens(user);

    await this.auditService.log({
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      metadata: { method: user.mfaEnabled ? 'MFA' : 'PASSWORD' },
    });

    return tokens;
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.sessionService.invalidateSession(refreshToken);
    
    await this.auditService.log({
      action: 'LOGOUT',
      userId,
    });
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const session = await this.sessionService.validateRefreshToken(refreshToken);
    if (!session) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const user = await User.findById(session.userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    await this.sessionService.invalidateSession(refreshToken);
    
    return this.generateTokens(user);
  }

  private async generateTokens(user: User): Promise<TokenPair> {
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      config.jwt.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: config.jwt.accessTokenExpiry,
        issuer: config.jwt.issuer,
      }
    );

    const refreshToken = await this.sessionService.createSession(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.accessTokenExpirySeconds,
    };
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    // Email sending implementation
  }

  private async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    // MFA verification implementation
    return true;
  }
}
