// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { ClientProxy, ClientsModule, Transport } from '@nestjs/microservices';
// import { MongooseModule } from '@nestjs/mongoose';
// import { JwtModule, JwtService } from '@nestjs/jwt';
// import { CacheModule } from '@nestjs/cache-manager';
// import { lastValueFrom } from 'rxjs';
// import { redisStore } from 'cache-manager-redis-yet';
// import * as mongoose from 'mongoose';
// import { AccessControlModule } from '../../src/access-control/access-control.module';
// import { UserModule } from '../../src/user/user.module';
// import { RoleModule } from '../../src/role/role.module';
// import { PermissionModule } from '../../src/permission/permission.module';
// import { CompanyModule } from '../../src/company/company.module';

// describe('AccessControl Integration Tests', () => {
//   let app: INestApplication;
//   let moduleFixture: TestingModule;
//   let coreClient: ClientProxy;
//   let jwtService: JwtService;
//   let configService: ConfigService;
//   let mongoConnection: mongoose.Connection;
  
//   // Datos de prueba
//   const testUserId = 'test-user-id';
//   const testCompanyId = 'test-company-id';
//   const testPermission = {
//     resource: 'users',
//     action: 'read',
//     level: 50,
//     description: 'Test permission'
//   };
//   const testModule = {
//     code: 'test-module',
//     name: 'Test Module',
//     description: 'Test module description',
//     isCore: true,
//     isActive: true
//   };

//   beforeAll(async () => {
//     // Cargar variables de entorno de prueba
//     process.env.NODE_ENV = 'test';
    
//     moduleFixture = await Test.createTestingModule({
//       imports: [
//         ConfigModule.forRoot({
//           isGlobal: true,
//           envFilePath: '.env.test',
//         }),
//         MongooseModule.forRootAsync({
//           imports: [ConfigModule],
//           inject: [ConfigService],
//           useFactory: async (configService: ConfigService) => ({
//             uri: configService.get<string>('MONGODB_URI'),
//           }),
//         }),
//         CacheModule.registerAsync({
//           isGlobal: true,
//           imports: [ConfigModule],
//           inject: [ConfigService],
//           useFactory: async (configService: ConfigService) => ({
//             store: await redisStore({
//               socket: {
//                 host: configService.get<string>('REDIS_HOST'),
//                 port: configService.get<number>('REDIS_PORT'),
//               },
//             }),
//             ttl: 60, // 1 minuto para pruebas
//           }),
//         }),
//         ClientsModule.registerAsync([
//           {
//             name: 'AUTH_SERVICE',
//             imports: [ConfigModule],
//             inject: [ConfigService],
//             useFactory: (configService: ConfigService) => ({
//               transport: Transport.NATS,
//               options: {
//                 servers: configService.get<string>('NATS_SERVERS').split(','),
//               },
//             }),
//           },
//         ]),
//         JwtModule.registerAsync({
//           imports: [ConfigModule],
//           inject: [ConfigService],
//           useFactory: (configService: ConfigService) => ({
//             secret: configService.get<string>('JWT_SECRET'),
//             signOptions: { expiresIn: '1h' },
//           }),
//         }),
//         AccessControlModule,
//         UserModule,
//         RoleModule,
//         PermissionModule,
//         CompanyModule,
//       ],
//     }).compile();

//     app = moduleFixture.createNestApplication();
//     await app.init();

//     // Obtener servicios necesarios
//     coreClient = moduleFixture.get('AUTH_SERVICE');
//     jwtService = moduleFixture.get(JwtService);
//     configService = moduleFixture.get(ConfigService);
    
//     // Conectar a la base de datos de prueba
//     mongoConnection = mongoose.connection;
    
//     // Limpiar la base de datos antes de las pruebas
//     await cleanDatabase();
    
//     // Configurar datos de prueba
//     await setupTestData();
//   });

//   afterAll(async () => {
//     // Limpiar la base de datos después de las pruebas
//     await cleanDatabase();
    
//     // Cerrar conexiones
//     await app.close();
//     await mongoConnection.close();
//   });

//   async function cleanDatabase() {
//     // Eliminar todas las colecciones de prueba
//     const collections = mongoConnection.collections;
//     for (const key in collections) {
//       await collections[key].deleteMany({});
//     }
//   }

//   async function setupTestData() {
//     // Crear datos de prueba en la base de datos
//     // Esto simula los datos que normalmente se crearían a través de los controladores
    
//     // Crear un usuario de prueba
//     const userCollection = mongoConnection.collection('users');
//     await userCollection.insertOne({
//       userId: testUserId,
//       email: 'test@example.com',
//       firstName: 'Test',
//       lastName: 'User',
//       isActive: true
//     });
    
//     // Crear una compañía de prueba
//     const companyCollection = mongoConnection.collection('companies');
//     const companyResult = await companyCollection.insertOne({
//       _id: new mongoose.Types.ObjectId(),
//       name: 'Test Company',
//       taxId: '123456789',
//       description: 'Test company description',
//       isActive: true
//     });
//     const companyId = companyResult.insertedId;
    
//     // Crear un rol de prueba
//     const roleCollection = mongoConnection.collection('roles');
//     const roleResult = await roleCollection.insertOne({
//       _id: new mongoose.Types.ObjectId(),
//       name: 'Test Role',
//       description: 'Test role description',
//       isSystemRole: false,
//       isActive: true
//     });
//     const roleId = roleResult.insertedId;
    
//     // Crear un permiso de prueba
//     const permissionCollection = mongoConnection.collection('permissions');
//     const permissionResult = await permissionCollection.insertOne({
//       resource: testPermission.resource,
//       action: testPermission.action,
//       level: testPermission.level,
//       description: testPermission.description
//     });
//     const permissionId = permissionResult.insertedId;
    
//     // Asignar el permiso al rol
//     const rolePermissionCollection = mongoConnection.collection('rolepermissions');
//     await rolePermissionCollection.insertOne({
//       role: roleId,
//       permission: permissionId,
//       isActive: true
//     });
    
//     // Asignar el rol al usuario para la compañía
//     const userCompanyRoleCollection = mongoConnection.collection('usercompanyroles');
//     await userCompanyRoleCollection.insertOne({
//       user: new mongoose.Types.ObjectId(userCollection.findOne({ userId: testUserId }).then(user => user._id)),
//       company: companyId,
//       roles: [roleId],
//       isActive: true,
//       assignedAt: new Date()
//     });
    
//     // Crear un módulo de prueba
//     const moduleCollection = mongoConnection.collection('modules');
//     await moduleCollection.insertOne({
//       code: testModule.code,
//       name: testModule.name,
//       description: testModule.description,
//       isCore: testModule.isCore,
//       isActive: testModule.isActive
//     });
//   }

//   describe('User Context Resolution', () => {
//     it('should resolve user context with valid token', async () => {
//       // Crear un token JWT válido para pruebas
//       const payload = {
//         sub: testUserId,
//         email: 'test@example.com'
//       };
      
//       const token = jwtService.sign(payload);
      
//       // Mockear la respuesta del servicio de autenticación
//       jest.spyOn(coreClient, 'send').mockImplementation((pattern, data) => {
//         if (pattern === 'auth.validate.token') {
//           return {
//             toPromise: () => Promise.resolve({ 
//               isValid: true, 
//               decoded: payload 
//             })
//           };
//         }
//         return null;
//       });
      
//       // Llamar al endpoint de resolución de contexto
//       const result = await lastValueFrom(
//         coreClient.send('core.resolve.userContext', {
//           token,
//           companyId: testCompanyId
//         })
//       );
      
//       // Verificar la respuesta
//       expect(result).toBeDefined();
//       expect(result.userId).toBe(testUserId);
//       expect(result.companyId).toBe(testCompanyId);
//       expect(Array.isArray(result.permissions)).toBe(true);
//       expect(Array.isArray(result.modules)).toBe(true);
//     });
//   });

//   describe('Access Control', () => {
//     it('should check access with valid token and permission', async () => {
//       // Crear un token JWT válido para pruebas
//       const payload = {
//         sub: testUserId,
//         email: 'test@example.com'
//       };
      
//       const token = jwtService.sign(payload);
      
//       // Mockear la respuesta del servicio de autenticación
//       jest.spyOn(coreClient, 'send').mockImplementation((pattern, data) => {
//         if (pattern === 'auth.validate.token') {
//           return {
//             toPromise: () => Promise.resolve({ 
//               isValid: true, 
//               decoded: payload 
//             })
//           };
//         }
//         return null;
//       });
      
//       // Llamar al endpoint de verificación de acceso
//       const result = await lastValueFrom(
//         coreClient.send('core.check.access', {
//           token,
//           resource: testPermission.resource,
//           action: testPermission.action,
//           companyId: testCompanyId
//         })
//       );
      
//       // Verificar la respuesta
//       expect(result).toBeDefined();
//       expect(result.hasAccess).toBe(true);
//       expect(result.userId).toBe(testUserId);
//       expect(result.level).toBe(testPermission.level);
//     });
//   });

//   describe('Module Resolution', () => {
//     it('should resolve modules with valid token', async () => {
//       // Crear un token JWT válido para pruebas
//       const payload = {
//         sub: testUserId,
//         email: 'test@example.com'
//       };
      
//       const token = jwtService.sign(payload);
      
//       // Mockear la respuesta del servicio de autenticación
//       jest.spyOn(coreClient, 'send').mockImplementation((pattern, data) => {
//         if (pattern === 'auth.validate.token') {
//           return {
//             toPromise: () => Promise.resolve({ 
//               isValid: true, 
//               decoded: payload 
//             })
//           };
//         }
//         return null;
//       });
      
//       // Llamar al endpoint de resolución de módulos
//       const result = await lastValueFrom(
//         coreClient.send('core.resolve.modules', {
//           token,
//           companyId: testCompanyId
//         })
//       );
      
//       // Verificar la respuesta
//       expect(result).toBeDefined();
//       expect(Array.isArray(result)).toBe(true);
//       if (result.length > 0) {
//         const testModuleResult = result.find(m => m.code === testModule.code);
//         if (testModuleResult) {
//           expect(testModuleResult.name).toBe(testModule.name);
//           expect(testModuleResult.isCore).toBe(testModule.isCore);
//         }
//       }
//     });
//   });
// });
