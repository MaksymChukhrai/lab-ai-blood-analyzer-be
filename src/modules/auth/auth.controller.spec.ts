import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { UserEntity } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';
import { Logger } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    logout: jest.Mock;
    getProfile: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };

  const mockUser: UserEntity = {
    id: '9e5252c1-9394-4b1b-92ab-329937e41c3a',
    email: 'test@example.com',
    provider: 'google',
    providerId: 'google-123',
    firstName: 'Test',
    lastName: 'User',
    picture: null,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockAuthService = {
      logout: jest.fn(),
      getProfile: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logout', () => {
    it('should logout user successfully and clear session + cookie', async () => {
      const destroyMock = jest.fn((callback: (err: Error | null) => void) => {
        callback(null);
      });

      const mockRequest = {
        session: {
          destroy: destroyMock,
        },
      } as unknown as Request;

      const clearCookieMock = jest.fn();
      const mockResponse = {
        clearCookie: clearCookieMock,
      } as unknown as Response;

      authService.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });
      configService.get.mockReturnValue('development');

      const result = await controller.logout(
        mockUser,
        mockRequest,
        mockResponse,
      );

      expect(authService.logout).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(destroyMock).toHaveBeenCalled();
      expect(clearCookieMock).toHaveBeenCalledWith('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
      });
    });

    it('should clear cookie with secure:true in production', async () => {
      const destroyMock = jest.fn((callback: (err: Error | null) => void) => {
        callback(null);
      });

      const mockRequest = {
        session: {
          destroy: destroyMock,
        },
      } as unknown as Request;

      const clearCookieMock = jest.fn();
      const mockResponse = {
        clearCookie: clearCookieMock,
      } as unknown as Response;

      authService.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });
      configService.get.mockReturnValue('production');

      await controller.logout(mockUser, mockRequest, mockResponse);

      expect(clearCookieMock).toHaveBeenCalledWith('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
    });

    it('should handle session destroy error gracefully', async () => {
      const destroyMock = jest.fn((callback: (err: Error | null) => void) => {
        callback(new Error('Session error'));
      });

      const mockRequest = {
        session: {
          destroy: destroyMock,
        },
      } as unknown as Request;

      const clearCookieMock = jest.fn();
      const mockResponse = {
        clearCookie: clearCookieMock,
      } as unknown as Response;

      authService.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });

      const result = await controller.logout(
        mockUser,
        mockRequest,
        mockResponse,
      );

      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should propagate service errors', async () => {
      const destroyMock = jest.fn();
      const mockRequest = {
        session: {
          destroy: destroyMock,
        },
      } as unknown as Request;

      const clearCookieMock = jest.fn();
      const mockResponse = {
        clearCookie: clearCookieMock,
      } as unknown as Response;

      authService.logout.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.logout(mockUser, mockRequest, mockResponse),
      ).rejects.toThrow('Service error');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', () => {
      const result = controller.getProfile(mockUser);

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        provider: mockUser.provider,
      });
    });
  });
});
