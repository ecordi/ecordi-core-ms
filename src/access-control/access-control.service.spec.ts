// import { Test, TestingModule } from '@nestjs/testing';
// import { getModelToken } from '@nestjs/mongoose';
// import { JwtService } from '@nestjs/jwt';
// import { AccessControlService } from './access-control.service';
// import { CacheService } from '../cache/cache.service';
// import { NatsTransportService } from '../transports/nats-transport.service';
// import { User } from '../user/schemas/user.schema';
// import { UserCompanyRole } from '../user/schemas/user-company-role.schema';
// import { Role } from '../role/schemas/role.schema';
// import { RolePermission } from '../role/schemas/role-permission.schema';
// import { Permission } from '../permission/schemas/permission.schema';
// import { Module as ModuleEntity } from './schemas/module.schema';
// import { UnauthorizedException } from '@nestjs/common';

// describe('AccessControlService', () => {
//   let service: AccessControlService;
//   let jwtService: JwtService;
//   let cacheService: CacheService;
//   let natsService: NatsTransportService;

//   // Mock models
//   const userModelMock = {
//     findOne: jest.fn(),
//   };
//   const userCompanyRoleModelMock = {
//     findOne: jest.fn(),
//     find: jest.fn(),
//   };
//   const roleModelMock = {
//     find: jest.fn(),
//   };
//   const rolePermissionModelMock = {
//     find: jest.fn(),
//   };
//   const permissionModelMock = {
//     findOne: jest.fn(),
//   };
//   const moduleModelMock = {
//     find: jest.fn(),
//   };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         AccessControlService,
//         {
//           provide: getModelToken(User.name),
//           useValue: userModelMock,
//         },
//         {
//           provide: getModelToken(UserCompanyRole.name),
//           useValue: userCompanyRoleModelMock,
//         },
//         {
//           provide: getModelToken(Role.name),
//           useValue: roleModelMock,
//         },
//         {
//           provide: getModelToken(RolePermission.name),
//           useValue: rolePermissionModelMock,
//         },
//         {
//           provide: getModelToken(Permission.name),
//           useValue: permissionModelMock,
//         },
//         {
//           provide: getModelToken(ModuleEntity.name),
//           useValue: moduleModelMock,
//         },
//         {
//           provide: JwtService,
//           useValue: {
//             decode: jest.fn(),
//           },
//         },
//         {
//           provide: CacheService,
//           useValue: {
//             get: jest.fn(),
//             set: jest.fn(),
//             delete: jest.fn(),
//             deleteByPattern: jest.fn(),
//             getUserContextKey: jest.fn(),
//             getAccessCheckKey: jest.fn(),
//           },
//         },
//         {
//           provide: NatsTransportService,
//           useValue: {
//             sendToAuthMs: jest.fn(),
//           },
//         },
//       ],
//     }).compile();

//     service = module.get<AccessControlService>(AccessControlService);
//     jwtService = module.get<JwtService>(JwtService);
//     cacheService = module.get<CacheService>(CacheService);
//     natsService = module.get<NatsTransportService>(NatsTransportService);
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });

//   describe('resolveUserContext', () => {
//     const mockToken = 'valid.jwt.token';
//     const mockUserId = 'user123';
//     const mockCompanyId = 'company123';
//     const mockDecodedToken = { sub: mockUserId };
//     const mockCacheKey = 'user:context:user123:company123';

//     it('should return cached user context if available', async () => {
//       const mockCachedContext = {
//         userId: mockUserId,
//         companyId: mockCompanyId,
//         permissions: [],
//         modules: [],
//       };

//       // Mock cache hit
//       jest.spyOn(cacheService, 'getUserContextKey').mockReturnValue(mockCacheKey);
//       jest.spyOn(cacheService, 'get').mockResolvedValue(mockCachedContext);

//       const result = await service.resolveUserContext({
//         token: mockToken,
//         companyId: mockCompanyId,
//       });

//       expect(cacheService.get).toHaveBeenCalledWith(mockCacheKey);
//       expect(result).toEqual(mockCachedContext);
//     });

//     it('should throw UnauthorizedException if token validation fails', async () => {
//       // Mock cache miss
//       jest.spyOn(cacheService, 'getUserContextKey').mockReturnValue(mockCacheKey);
//       jest.spyOn(cacheService, 'get').mockResolvedValue(null);

//       // Mock token validation failure
//       jest.spyOn(natsService, 'sendToAuthMs').mockResolvedValue({
//         valid: false,
//         message: 'Invalid token',
//       });

//       await expect(
//         service.resolveUserContext({
//           token: mockToken,
//           companyId: mockCompanyId,
//         }),
//       ).rejects.toThrow(UnauthorizedException);

//       expect(cacheService.get).toHaveBeenCalledWith(mockCacheKey);
//       expect(natsService.sendToAuthMs).toHaveBeenCalledWith('auth.validate.token', {
//         token: mockToken,
//       });
//     });

//     it('should resolve and cache user context if token is valid', async () => {
//       // Mock cache miss
//       jest.spyOn(cacheService, 'getUserContextKey').mockReturnValue(mockCacheKey);
//       jest.spyOn(cacheService, 'get').mockResolvedValue(null);

//       // Mock token validation success
//       jest.spyOn(natsService, 'sendToAuthMs').mockResolvedValue({
//         valid: true,
//         userId: mockUserId,
//       });

//       // Mock JWT decode
//       jest.spyOn(jwtService, 'decode').mockReturnValue(mockDecodedToken);

//       // Mock user data
//       const mockUser = {
//         _id: 'userId',
//         userId: mockUserId,
//         email: 'user@example.com',
//         firstName: 'Test',
//         lastName: 'User',
//       };
//       userModelMock.findOne.mockReturnValue({
//         exec: jest.fn().mockResolvedValue(mockUser),
//       });

//       // Mock user company roles
//       const mockRoles = [
//         { _id: 'role1', name: 'Admin' },
//         { _id: 'role2', name: 'User' },
//       ];
//       userCompanyRoleModelMock.findOne.mockReturnValue({
//         exec: jest.fn().mockResolvedValue({
//           user: mockUser._id,
//           company: mockCompanyId,
//           roles: ['role1', 'role2'],
//           isActive: true,
//         }),
//       });

//       // Mock roles
//       roleModelMock.find.mockReturnValue({
//         exec: jest.fn().mockResolvedValue(mockRoles),
//       });

//       // Mock role permissions
//       rolePermissionModelMock.find.mockReturnValue({
//         populate: jest.fn().mockReturnValue({
//           exec: jest.fn().mockResolvedValue([
//             {
//               role: 'role1',
//               permission: {
//                 _id: 'perm1',
//                 resource: 'users',
//                 action: 'read',
//                 level: 50,
//               },
//             },
//           ]),
//         }),
//       });

//       // Mock modules
//       moduleModelMock.find.mockReturnValue({
//         exec: jest.fn().mockResolvedValue([
//           {
//             _id: 'module1',
//             code: 'users',
//             name: 'Users',
//             isCore: true,
//             isActive: true,
//           },
//         ]),
//       });

//       const result = await service.resolveUserContext({
//         token: mockToken,
//         companyId: mockCompanyId,
//       });

//       expect(cacheService.get).toHaveBeenCalledWith(mockCacheKey);
//       expect(natsService.sendToAuthMs).toHaveBeenCalledWith('auth.validate.token', {
//         token: mockToken,
//       });
//       expect(cacheService.set).toHaveBeenCalled();
//       expect(result).toHaveProperty('userId', mockUserId);
//       expect(result).toHaveProperty('companyId', mockCompanyId);
//       expect(result).toHaveProperty('permissions');
//       expect(result).toHaveProperty('modules');
//     });
//   });

//   describe('checkAccess', () => {
//     const mockToken = 'valid.jwt.token';
//     const mockUserId = 'user123';
//     const mockCompanyId = 'company123';
//     const mockResource = 'users';
//     const mockAction = 'read';
//     const mockCacheKey = 'access:check:user123:company123:users:read';

//     it('should return cached access check if available', async () => {
//       const mockCachedResult = {
//         hasAccess: true,
//         userId: mockUserId,
//         level: 50,
//       };

//       // Mock cache hit
//       jest.spyOn(cacheService, 'getAccessCheckKey').mockReturnValue(mockCacheKey);
//       jest.spyOn(cacheService, 'get').mockResolvedValue(mockCachedResult);

//       const result = await service.checkAccess({
//         token: mockToken,
//         resource: mockResource,
//         action: mockAction,
//         companyId: mockCompanyId,
//       });

//       expect(cacheService.get).toHaveBeenCalledWith(mockCacheKey);
//       expect(result).toEqual(mockCachedResult);
//     });

//     it('should check access and cache result if not in cache', async () => {
//       // Mock user context
//       const mockUserContext = {
//         userId: mockUserId,
//         companyId: mockCompanyId,
//         permissions: [
//           {
//             resource: mockResource,
//             action: mockAction,
//             level: 50,
//           },
//         ],
//         modules: [],
//       };

//       // Mock resolveUserContext
//       jest.spyOn(service, 'resolveUserContext').mockResolvedValue(mockUserContext);

//       // Mock cache miss
//       jest.spyOn(cacheService, 'getAccessCheckKey').mockReturnValue(mockCacheKey);
//       jest.spyOn(cacheService, 'get').mockResolvedValue(null);

//       const result = await service.checkAccess({
//         token: mockToken,
//         resource: mockResource,
//         action: mockAction,
//         companyId: mockCompanyId,
//       });

//       expect(cacheService.get).toHaveBeenCalledWith(mockCacheKey);
//       expect(service.resolveUserContext).toHaveBeenCalledWith({
//         token: mockToken,
//         companyId: mockCompanyId,
//       });
//       expect(cacheService.set).toHaveBeenCalled();
//       expect(result).toEqual({
//         hasAccess: true,
//         userId: mockUserId,
//         level: 50,
//       });
//     });

//     it('should return no access if user does not have permission', async () => {
//       // Mock user context without the required permission
//       const mockUserContext = {
//         userId: mockUserId,
//         companyId: mockCompanyId,
//         permissions: [
//           {
//             resource: 'other-resource',
//             action: 'read',
//             level: 50,
//           },
//         ],
//         modules: [],
//       };

//       // Mock resolveUserContext
//       jest.spyOn(service, 'resolveUserContext').mockResolvedValue(mockUserContext);

//       // Mock cache miss
//       jest.spyOn(cacheService, 'getAccessCheckKey').mockReturnValue(mockCacheKey);
//       jest.spyOn(cacheService, 'get').mockResolvedValue(null);

//       const result = await service.checkAccess({
//         token: mockToken,
//         resource: mockResource,
//         action: mockAction,
//         companyId: mockCompanyId,
//       });

//       expect(result).toEqual({
//         hasAccess: false,
//         userId: mockUserId,
//         level: 0,
//       });
//     });
//   });
// });
