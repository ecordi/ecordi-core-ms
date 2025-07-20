# Core Microservice (core-ms)

Microservicio central del sistema que actúa como coordinador para la gestión de usuarios, compañías, roles, permisos y control de acceso.

## Descripción

Este microservicio implementa una arquitectura limpia con los siguientes componentes:

- **Control de Acceso**: Resolución de contexto de usuario, verificación de permisos y resolución de módulos visibles.
- **Usuarios**: Gestión de usuarios y sus relaciones con compañías y roles.
- **Compañías**: Gestión de empresas en el sistema.
- **Roles**: Gestión de roles y sus permisos asociados.
- **Permisos**: Gestión de permisos para recursos y acciones.

## Tecnologías

- NestJS como framework principal
- MongoDB (Mongoose) para persistencia de datos
- NATS para comunicación entre microservicios
- Redis para caché opcional
- JWT para decodificación de tokens
- Swagger para documentación de API

## Requisitos

- Node.js 18 o superior
- MongoDB 6 o superior
- NATS Server 2.9 o superior
- Redis 7 o superior (opcional para caché)

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:

```bash
npm install
```

3. Configurar variables de entorno (copiar `.env.example` a `.env` y ajustar valores)
4. Iniciar el servicio:

```bash
npm run start:dev
```

## Despliegue con Docker

Para desplegar el servicio con Docker:

```bash
docker-compose up -d
```

Esto iniciará el microservicio junto con MongoDB, NATS y Redis.

## Patrones de Mensajes NATS

### Control de Acceso

- `core.resolve.userContext`: Resuelve el contexto completo de un usuario
- `core.check.access`: Verifica si un usuario tiene acceso a un recurso y acción
- `core.resolve.modules`: Resuelve los módulos visibles para un usuario en una compañía

### Usuarios

- `core.user.sync`: Crea o actualiza un usuario desde auth-ms
- `core.user.assignRoles`: Asigna roles a un usuario en una compañía
- `core.user.revokeAccess`: Revoca el acceso de un usuario a una compañía
- `core.user.companies`: Obtiene las compañías a las que tiene acceso un usuario

### Compañías

- `core.company.create`: Crea una nueva compañía
- `core.company.update`: Actualiza una compañía existente
- `core.company.findById`: Busca una compañía por su ID
- `core.company.findByTaxId`: Busca una compañía por su identificación fiscal
- `core.company.findAll`: Obtiene todas las compañías activas
- `core.company.deactivate`: Desactiva una compañía

### Roles

- `core.role.create`: Crea un nuevo rol
- `core.role.update`: Actualiza un rol existente
- `core.role.findById`: Busca un rol por su ID
- `core.role.findByName`: Busca un rol por su nombre
- `core.role.findAll`: Obtiene todos los roles activos
- `core.role.assignPermissions`: Asigna permisos a un rol
- `core.role.permissions`: Obtiene los permisos asignados a un rol
- `core.role.deactivate`: Desactiva un rol

### Permisos

- `core.permission.create`: Crea un nuevo permiso
- `core.permission.update`: Actualiza un permiso existente
- `core.permission.findById`: Busca un permiso por su ID
- `core.permission.findByResourceAndAction`: Busca un permiso por recurso y acción
- `core.permission.findAll`: Obtiene todos los permisos
- `core.permission.findByResource`: Obtiene permisos por recurso
- `core.permission.remove`: Elimina un permiso

## Integración con otros Microservicios

Este microservicio se integra con:

- **auth-ms**: Para validación de tokens y sincronización de usuarios
- Otros microservicios que requieran verificación de permisos

## Seguridad

- Delegación de verificación de JWT a auth-ms
- Caché de contexto de usuario y resultados de acceso para mejorar rendimiento
- Middleware e interceptores para proteger llamadas entrantes
