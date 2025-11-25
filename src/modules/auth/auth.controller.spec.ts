import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';

describe('AuthController - Logout', () => {
  let controller: AuthController;
  let authService: AuthService;
  let configService: ConfigService;

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

  const mockAuthService = {
    logout: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      return null;
    }),
  };

  const createMockRequest = (shouldError = false) =>
    ({
      session: {
        destroy: jest.fn((callback) => {
          if (shouldError) {
            callback(new Error('Session error'));
          } else {
            callback(null);
          }
        }),
      },
    }) as unknown as Request;

  const createMockResponse = () =>
    ({
      clearCookie: jest.fn(),
    }) as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      mockAuthService.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });

      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = await controller.logout(
        mockUser,
        mockRequest,
        mockResponse,
      );

      expect(authService.logout).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should destroy session on logout', async () => {
      mockAuthService.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });

      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      await controller.logout(mockUser, mockRequest, mockResponse);

      expect(mockRequest.session.destroy).toHaveBeenCalled();
    });

    it('should clear connect.sid cookie', async () => {
      mockAuthService.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });

      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      await controller.logout(mockUser, mockRequest, mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
      });
    });

    it('should handle session destroy error gracefully', async () => {
      mockAuthService.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });

      const mockRequest = createMockRequest(true);
      const mockResponse = createMockResponse();

      const result = await controller.logout(
        mockUser,
        mockRequest,
        mockResponse,
      );

      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should set secure cookie in production', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('production');

      mockAuthService.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });

      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      await controller.logout(mockUser, mockRequest, mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
    });

    it('should handle logout service error', async () => {
      mockAuthService.logout.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      await expect(
        controller.logout(mockUser, mockRequest, mockResponse),
      ).rejects.toThrow('Database connection failed');
    });
  });
});
