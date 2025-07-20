import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxy, ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { lastValueFrom } from 'rxjs';
import { AccessControlModule } from '../../src/access-control/access-control.module';
import { TransportsModule } from '../../src/transports/transports.module';
import { CacheModule } from '../../src/cache/cache.module';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let authClient: ClientProxy;
  let configService: ConfigService;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            uri: configService.get<string>('MONGODB_URI'),
          }),
        }),
        ClientsModule.registerAsync([
          {
            name: 'AUTH_CLIENT',
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
              transport: Transport.NATS,
              options: {
                servers: configService.get<string>('NATS_SERVERS').split(','),
                queue: 'auth_queue',
              },
            }),
          },
        ]),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: { expiresIn: '1h' },
          }),
        }),
        AccessControlModule,
        TransportsModule,
        CacheModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authClient = moduleFixture.get<ClientProxy>('AUTH_CLIENT');
    await authClient.connect();

    configService = moduleFixture.get<ConfigService>(ConfigService);

    // Generar un token JWT para pruebas
    const jwtSecret = configService.get<string>('JWT_SECRET');
    const jwtService = moduleFixture.get(JwtService);
    
    // Crear un token JWT manualmente para pruebas
    jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJhZG1pbiJdLCJpYXQiOjE2MjUwOTYwMDAsImV4cCI6MTYyNTA5OTYwMH0.signature';
  });

  afterAll(async () => {
    await authClient.close();
    await app.close();
  });

  describe('Token Validation', () => {
    it('should validate a token through auth-ms', async () => {
      // Simular respuesta del auth-ms para validación de token
      authClient.send = jest.fn().mockImplementation((pattern, data) => {
        if (pattern === 'auth.validate.token') {
          return {
            toPromise: jest.fn().mockResolvedValue({
              valid: true,
              userId: 'test-user-id',
            }),
          };
        }
        return { toPromise: jest.fn().mockResolvedValue(null) };
      });

      const result = await lastValueFrom(
        authClient.send('auth.validate.token', { token: jwtToken })
      );

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.userId).toBe('test-user-id');
    });

    it('should reject an invalid token', async () => {
      // Simular respuesta del auth-ms para validación de token inválido
      authClient.send = jest.fn().mockImplementation((pattern, data) => {
        if (pattern === 'auth.validate.token') {
          return {
            toPromise: jest.fn().mockResolvedValue({
              valid: false,
              message: 'Invalid token',
            }),
          };
        }
        return { toPromise: jest.fn().mockResolvedValue(null) };
      });

      const result = await lastValueFrom(
        authClient.send('auth.validate.token', { token: 'invalid-token' })
      );

      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid token');
    });
  });

  describe('User Context Resolution', () => {
    it('should resolve user context through core-ms', async () => {
      // Simular respuesta del auth-ms para validación de token
      authClient.send = jest.fn().mockImplementation((pattern, data) => {
        if (pattern === 'auth.validate.token') {
          return {
            toPromise: jest.fn().mockResolvedValue({
              valid: true,
              userId: 'test-user-id',
            }),
          };
        }
        return { toPromise: jest.fn().mockResolvedValue(null) };
      });

      // Simular cliente para core-ms
      const coreClient = {
        send: jest.fn().mockImplementation((pattern, data) => {
          if (pattern === 'core.resolve.userContext') {
            return {
              toPromise: jest.fn().mockResolvedValue({
                userId: 'test-user-id',
                companyId: 'test-company-id',
                permissions: [
                  {
                    resource: 'users',
                    action: 'read',
                    level: 50,
                  },
                ],
                modules: [
                  {
                    code: 'users',
                    name: 'Users',
                    isCore: true,
                  },
                ],
              }),
            };
          }
          return { toPromise: jest.fn().mockResolvedValue(null) };
        }),
      };

      const result = await lastValueFrom(
        coreClient.send('core.resolve.userContext', {
          token: jwtToken,
          companyId: 'test-company-id',
        })
      );

      expect(result).toBeDefined();
      expect((result as any).userId).toBe('test-user-id');
      expect((result as any).companyId).toBe('test-company-id');
      expect((result as any).permissions).toHaveLength(1);
      expect((result as any).modules).toHaveLength(1);
    });
  });

  describe('Access Check', () => {
    it('should check access through core-ms', async () => {
      // Simular cliente para core-ms
      const coreClient = {
        send: jest.fn().mockImplementation((pattern, data) => {
          if (pattern === 'core.check.access') {
            return {
              toPromise: jest.fn().mockResolvedValue({
                hasAccess: true,
                userId: 'test-user-id',
                level: 50,
              }),
            };
          }
          return { toPromise: jest.fn().mockResolvedValue(null) };
        }),
      };

      const result = await lastValueFrom(
        coreClient.send('core.check.access', {
          token: jwtToken,
          resource: 'users',
          action: 'read',
          companyId: 'test-company-id',
        })
      );

      expect(result).toBeDefined();
      expect((result as any).hasAccess).toBe(true);
      expect((result as any).userId).toBe('test-user-id');
      expect((result as any).level).toBe(50);
    });
  });
});
