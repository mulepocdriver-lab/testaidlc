import { AuthService } from '../../src/services/auth.service';
import { User } from '../../src/models/user.model';
import bcrypt from 'bcrypt';

jest.mock('../../src/models/user.model');
jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (User.create as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: dto.email,
        name: dto.name,
        status: 'pending_verification',
      });

      const result = await authService.register(dto);

      expect(User.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(result.status).toBe('pending_verification');
    });

    it('should throw error if user already exists', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      await expect(authService.register({
        email: 'existing@example.com',
        password: 'password',
        name: 'Test',
      })).rejects.toThrow('USER_ALREADY_EXISTS');
    });

    it('should send verification email after registration', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      (User.create as jest.Mock).mockResolvedValue({ id: 'new-user' });

      const sendEmailSpy = jest.spyOn(authService as any, 'sendVerificationEmail');
      
      await authService.register({
        email: 'new@example.com',
        password: 'password',
        name: 'New User',
      });

      expect(sendEmailSpy).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashedPassword',
      mfaEnabled: false,
    };

    it('should return tokens for valid credentials', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'correctPassword',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('should throw error for invalid password', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login({
        email: 'test@example.com',
        password: 'wrongPassword',
      })).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error for non-existent user', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: 'password',
      })).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should require MFA code when MFA is enabled', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue({ ...mockUser, mfaEnabled: true });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result.accessToken).toBe('');
    });
  });

  describe('logout', () => {
    it('should invalidate the session', async () => {
      const invalidateSpy = jest.spyOn(
        (authService as any).sessionService, 
        'invalidateSession'
      ).mockResolvedValue(undefined);

      await authService.logout('user-123', 'refresh-token');

      expect(invalidateSpy).toHaveBeenCalledWith('refresh-token');
    });
  });
});
