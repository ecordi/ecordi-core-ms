import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Cargar variables de entorno
dotenv.config();

// Función principal para sembrar datos
async function seedData() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/core-ms';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Conectado a MongoDB');

    const db = client.db();

    // Limpiar colecciones existentes
    await db.collection('users').deleteMany({});
    await db.collection('companies').deleteMany({});
    await db.collection('roles').deleteMany({});
    await db.collection('permissions').deleteMany({});
    await db.collection('rolepermissions').deleteMany({});
    await db.collection('usercompanyroles').deleteMany({});
    await db.collection('modules').deleteMany({});

    console.log('Colecciones limpiadas');

    // Crear permisos
    const permissions = [
      {
        resource: 'users',
        action: 'create',
        level: 80,
        description: 'Crear usuarios',
      },
      {
        resource: 'users',
        action: 'read',
        level: 50,
        description: 'Ver usuarios',
      },
      {
        resource: 'users',
        action: 'update',
        level: 70,
        description: 'Actualizar usuarios',
      },
      {
        resource: 'users',
        action: 'delete',
        level: 90,
        description: 'Eliminar usuarios',
      },
      {
        resource: 'companies',
        action: 'create',
        level: 80,
        description: 'Crear compañías',
      },
      {
        resource: 'companies',
        action: 'read',
        level: 50,
        description: 'Ver compañías',
      },
      {
        resource: 'companies',
        action: 'update',
        level: 70,
        description: 'Actualizar compañías',
      },
      {
        resource: 'companies',
        action: 'delete',
        level: 90,
        description: 'Eliminar compañías',
      },
      {
        resource: 'roles',
        action: 'create',
        level: 80,
        description: 'Crear roles',
      },
      {
        resource: 'roles',
        action: 'read',
        level: 50,
        description: 'Ver roles',
      },
      {
        resource: 'roles',
        action: 'update',
        level: 70,
        description: 'Actualizar roles',
      },
      {
        resource: 'roles',
        action: 'delete',
        level: 90,
        description: 'Eliminar roles',
      },
      {
        resource: 'permissions',
        action: 'create',
        level: 80,
        description: 'Crear permisos',
      },
      {
        resource: 'permissions',
        action: 'read',
        level: 50,
        description: 'Ver permisos',
      },
      {
        resource: 'permissions',
        action: 'update',
        level: 70,
        description: 'Actualizar permisos',
      },
      {
        resource: 'permissions',
        action: 'delete',
        level: 90,
        description: 'Eliminar permisos',
      },
      {
        resource: 'modules',
        action: 'read',
        level: 50,
        description: 'Ver módulos',
      },
    ];

    const permissionResult = await db.collection('permissions').insertMany(permissions);
    console.log(`${permissionResult.insertedCount} permisos insertados`);

    // Crear roles
    const roles = [
      {
        name: 'Super Admin',
        description: 'Administrador con acceso completo',
        isSystemRole: true,
        isActive: true,
      },
      {
        name: 'Admin',
        description: 'Administrador de compañía',
        isSystemRole: false,
        isActive: true,
      },
      {
        name: 'User',
        description: 'Usuario regular',
        isSystemRole: false,
        isActive: true,
      },
      {
        name: 'Guest',
        description: 'Usuario invitado con acceso limitado',
        isSystemRole: false,
        isActive: true,
      },
    ];

    const roleResult = await db.collection('roles').insertMany(roles);
    console.log(`${roleResult.insertedCount} roles insertados`);

    // Asignar permisos a roles
    const permissionIds = Object.values(permissionResult.insertedIds);
    const roleIds = Object.values(roleResult.insertedIds);

    // Super Admin tiene todos los permisos
    const superAdminPermissions = permissionIds.map(permissionId => ({
      role: roleIds[0],
      permission: permissionId,
      isActive: true,
    }));

    // Admin tiene todos excepto eliminar permisos y roles
    const adminPermissions = permissionIds
      .filter(
        (_, index) =>
          !(
            (index === 11 && permissions[index].resource === 'roles' && permissions[index].action === 'delete') ||
            (index === 15 && permissions[index].resource === 'permissions' && permissions[index].action === 'delete')
          )
      )
      .map(permissionId => ({
        role: roleIds[1],
        permission: permissionId,
        isActive: true,
      }));

    // User tiene permisos de lectura
    const userPermissions = permissionIds
      .filter((_, index) => permissions[index].action === 'read')
      .map(permissionId => ({
        role: roleIds[2],
        permission: permissionId,
        isActive: true,
      }));

    // Guest solo puede ver módulos
    const guestPermissions = permissionIds
      .filter((_, index) => permissions[index].resource === 'modules' && permissions[index].action === 'read')
      .map(permissionId => ({
        role: roleIds[3],
        permission: permissionId,
        isActive: true,
      }));

    const allRolePermissions = [
      ...superAdminPermissions,
      ...adminPermissions,
      ...userPermissions,
      ...guestPermissions,
    ];

    const rolePermissionResult = await db.collection('rolepermissions').insertMany(allRolePermissions);
    console.log(`${rolePermissionResult.insertedCount} asignaciones de permisos insertadas`);

    // Crear compañías
    const companies = [
      {
        name: 'Empresa Principal',
        taxId: '12345678901',
        description: 'Empresa principal del sistema',
        address: 'Calle Principal 123',
        phone: '+1234567890',
        email: 'contacto@empresaprincipal.com',
        website: 'www.empresaprincipal.com',
        isActive: true,
      },
      {
        name: 'Empresa Secundaria',
        taxId: '98765432109',
        description: 'Empresa secundaria del sistema',
        address: 'Calle Secundaria 456',
        phone: '+0987654321',
        email: 'contacto@empresasecundaria.com',
        website: 'www.empresasecundaria.com',
        isActive: true,
      },
    ];

    const companyResult = await db.collection('companies').insertMany(companies);
    console.log(`${companyResult.insertedCount} compañías insertadas`);

    // Crear usuarios
    const users = [
      {
        userId: uuidv4(),
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        lastLogin: new Date(),
      },
      {
        userId: uuidv4(),
        email: 'user@example.com',
        firstName: 'Regular',
        lastName: 'User',
        isActive: true,
        lastLogin: new Date(),
      },
      {
        userId: uuidv4(),
        email: 'guest@example.com',
        firstName: 'Guest',
        lastName: 'User',
        isActive: true,
        lastLogin: new Date(),
      },
    ];

    const userResult = await db.collection('users').insertMany(users);
    console.log(`${userResult.insertedCount} usuarios insertados`);

    // Asignar usuarios a compañías con roles
    const userIds = Object.values(userResult.insertedIds);
    const companyIds = Object.values(companyResult.insertedIds);

    const userCompanyRoles = [
      // Admin en ambas compañías con rol Super Admin
      {
        user: userIds[0],
        company: companyIds[0],
        roles: [roleIds[0]],
        isActive: true,
        assignedAt: new Date(),
      },
      {
        user: userIds[0],
        company: companyIds[1],
        roles: [roleIds[0]],
        isActive: true,
        assignedAt: new Date(),
      },
      // Usuario regular en primera compañía con rol User
      {
        user: userIds[1],
        company: companyIds[0],
        roles: [roleIds[2]],
        isActive: true,
        assignedAt: new Date(),
      },
      // Usuario invitado en segunda compañía con rol Guest
      {
        user: userIds[2],
        company: companyIds[1],
        roles: [roleIds[3]],
        isActive: true,
        assignedAt: new Date(),
      },
    ];

    const userCompanyRoleResult = await db.collection('usercompanyroles').insertMany(userCompanyRoles);
    console.log(`${userCompanyRoleResult.insertedCount} asignaciones de usuarios a compañías insertadas`);

    // Crear módulos
    const modules = [
      {
        code: 'dashboard',
        name: 'Dashboard',
        description: 'Panel principal',
        order: 1,
        icon: 'dashboard',
        isCore: true,
        isActive: true,
      },
      {
        code: 'users',
        name: 'Usuarios',
        description: 'Gestión de usuarios',
        order: 2,
        icon: 'people',
        isCore: true,
        isActive: true,
      },
      {
        code: 'companies',
        name: 'Compañías',
        description: 'Gestión de compañías',
        order: 3,
        icon: 'business',
        isCore: true,
        isActive: true,
      },
      {
        code: 'roles',
        name: 'Roles',
        description: 'Gestión de roles',
        order: 4,
        icon: 'security',
        isCore: true,
        isActive: true,
      },
      {
        code: 'permissions',
        name: 'Permisos',
        description: 'Gestión de permisos',
        order: 5,
        icon: 'vpn_key',
        isCore: true,
        isActive: true,
      },
      {
        code: 'reports',
        name: 'Reportes',
        description: 'Reportes del sistema',
        order: 6,
        icon: 'assessment',
        isCore: false,
        isActive: true,
      },
    ];

    const moduleResult = await db.collection('modules').insertMany(modules);
    console.log(`${moduleResult.insertedCount} módulos insertados`);

    console.log('Datos sembrados exitosamente');
  } catch (error) {
    console.error('Error al sembrar datos:', error);
  } finally {
    await client.close();
    console.log('Conexión cerrada');
  }
}

// Ejecutar la función
seedData().catch(console.error);
