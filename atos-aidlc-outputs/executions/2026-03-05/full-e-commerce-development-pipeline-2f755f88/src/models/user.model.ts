import { prisma } from '../lib/prisma';

export type UserStatus = 'pending_verification' | 'active' | 'suspended' | 'deleted';
export type UserRole = 'user' | 'admin' | 'superadmin';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  status: UserStatus;
  role: UserRole;
  mfaEnabled: boolean;
  mfaSecret?: string;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  name: string;
  status?: UserStatus;
  role?: UserRole;
  createdAt?: Date;
}

export const User = {
  async create(dto: CreateUserDto): Promise<User> {
    return prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: dto.passwordHash,
        name: dto.name,
        status: dto.status || 'pending_verification',
        role: dto.role || 'user',
        mfaEnabled: false,
        createdAt: dto.createdAt || new Date(),
        updatedAt: new Date(),
      },
    });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async update(id: string, data: Partial<User>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { status: 'deleted', updatedAt: new Date() },
    });
  },
};
