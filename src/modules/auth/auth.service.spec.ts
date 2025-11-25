import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';
import { MagicLinkTokenEntity } from './entities/magic-link-token.entity';
import { EmailService } from '@common/services/email.service';

describe('AuthService - Logout', () => {
  let service: AuthService;

  const mockUser: UserEntity = {
    id: '9e5252c1-9394-4b1b-92ab-329937e41c3a',
    email: 'm.chukhrai.job@gmail.com',
    provider: 'google',
    providerId: '123456',
    firstName: 'Maksym',
    lastName: 'Chukhrai',
    picture: 'https://example.com/avatar.jpg',
    refreshToken: 'valid_refresh_token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MagicLinkTokenEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
            getOrThrow: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendMagicLink: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logout', () => {
    it('should successfully logout user and clear refresh token', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });
      mockQueryRunner.manager.delete.mockResolvedValue({ affected: 0 });

      const result = await service.logout(mockUser.id);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(UserEntity, {
        where: { id: mockUser.id },
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should delete magic link tokens on logout', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });
      mockQueryRunner.manager.delete.mockResolvedValue({ affected: 2 });

      await service.logout(mockUser.id);

      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(
        MagicLinkTokenEntity,
        { user: { id: mockUser.id } },
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.logout(mockUser.id)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockUser);
      mockQueryRunner.manager.save.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.logout(mockUser.id)).rejects.toThrow(
        'Database error',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should set refreshToken to null', async () => {
      const userWithToken = { ...mockUser, refreshToken: 'old_token' };
      mockQueryRunner.manager.findOne.mockResolvedValue(userWithToken);

      let savedUser: UserEntity | undefined;
      mockQueryRunner.manager.save.mockImplementation((user: UserEntity) => {
        savedUser = user;
        return Promise.resolve(user);
      });

      await service.logout(mockUser.id);

      expect(savedUser).toBeDefined();
      expect(savedUser?.refreshToken).toBeNull();
    });
  });
});
