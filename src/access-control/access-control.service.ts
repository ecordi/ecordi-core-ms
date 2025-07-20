import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from '../cache/cache.service';
import { NatsTransportService } from '../transports/nats-transport.service';
import { CheckAccessDto } from './dto/check-access.dto';
import { ResolveUserContextDto } from './dto/resolve-user-context.dto';
import { UserContextResponseDto, ModuleAccessDto } from './dto/user-context-response.dto';
import { CheckAccessResponseDto } from './dto/check-access-response.dto';
import { ResolveModulesDto } from './dto/resolve-modules.dto';
import { User } from '../user/schemas/user.schema';
import { UserCompanyRole } from '../user/schemas/user-company-role.schema';
import { Role } from '../role/schemas/role.schema';
import { RolePermission } from '../role/schemas/role-permission.schema';
import { Permission } from '../permission/schemas/permission.schema';
import { Module } from './schemas/module.schema';

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger('AccessControlService');

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserCompanyRole.name) private userCompanyRoleModel: Model<UserCompanyRole>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(RolePermission.name) private rolePermissionModel: Model<RolePermission>,
    @InjectModel(Permission.name) private permissionModel: Model<Permission>,
    @InjectModel(Module.name) private moduleModel: Model<Module>,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly natsService: NatsTransportService,
  ) {}

  /**
   * Resuelve el contexto completo de un usuario
   * @param dto Datos para resolver el contexto
   * @returns Contexto completo del usuario
   */
  async resolveUserContext(dto: ResolveUserContextDto): Promise<UserContextResponseDto> {
    try {
      let userId = dto.userId;
      
      // Si se proporciona un token, verificarlo con auth-ms
      if (dto.token && !userId) {
        const verifyResult = await this.natsService.sendToAuth<{ userId: string }>('auth.verify.user', { token: dto.token });
        userId = verifyResult.userId;
      }
      
      if (!userId) {
        throw new UnauthorizedException('No se proporcionó un userId válido o token');
      }
      
      // Intentar obtener de caché primero
      const cacheKey = this.cacheService.getUserContextKey(userId, dto.companyId);
      const cachedContext = await this.cacheService.get<UserContextResponseDto>(cacheKey);
      
      if (cachedContext) {
        this.logger.debug(`Contexto de usuario obtenido de caché: ${userId}`);
        return cachedContext;
      }
      
      // Buscar el usuario en la base de datos
      const user = await this.userModel.findOne({ userId }).exec();
      
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }
      
      // Obtener las relaciones de usuario-compañía-rol
      let userCompanyRoles;
      
      if (dto.companyId) {
        // Si se especifica una compañía, obtener solo esa relación
        userCompanyRoles = await this.userCompanyRoleModel
          .find({ user: user._id, company: dto.companyId, isActive: true })
          .populate('company')
          .populate('roles')
          .exec();
      } else {
        // Si no se especifica compañía, obtener todas las relaciones activas
        userCompanyRoles = await this.userCompanyRoleModel
          .find({ user: user._id, isActive: true })
          .populate('company')
          .populate('roles')
          .exec();
      }
      
      if (!userCompanyRoles || userCompanyRoles.length === 0) {
        throw new UnauthorizedException('Usuario no tiene acceso a la compañía especificada');
      }
      
      // Usar la primera compañía si no se especificó una
      const userCompanyRole = userCompanyRoles[0];
      const companyId = userCompanyRole.company._id.toString();
      const companyName = userCompanyRole.company['name'];
      
      // Obtener los roles del usuario
      const roleIds = userCompanyRole.roles.map(role => role._id);
      const roleNames = userCompanyRole.roles.map(role => role['name']);
      
      // Obtener los permisos asociados a los roles
      const rolePermissions = await this.rolePermissionModel
        .find({ role: { $in: roleIds }, isActive: true })
        .populate('permission')
        .exec();
      
      // Extraer los permisos únicos
      const permissionMap = new Map();
      rolePermissions.forEach(rp => {
        const permission = rp.permission;
        const key = `${permission['resource']}:${permission['action']}`;
        const currentLevel = permissionMap.get(key)?.level || 0;
        
        // Guardar el nivel más alto para cada permiso
        if (permission['level'] > currentLevel) {
          permissionMap.set(key, {
            resource: permission['resource'],
            action: permission['action'],
            level: permission['level']
          });
        }
      });
      
      // Convertir el mapa a un array de strings con formato "recurso:acción"
      const permissions = Array.from(permissionMap.keys());
      
      // Calcular el nivel de acceso máximo
      const accessLevel = Math.max(...Array.from(permissionMap.values()).map(p => p.level), 0);
      
      // Resolver los módulos visibles
      const modules = await this.resolveModulesAccess(userId, companyId);
      
      // Construir la respuesta
      const userContext: UserContextResponseDto = {
        userId: user.userId,
        email: user.email,
        companyId,
        companyName,
        roles: roleNames,
        permissions,
        modules,
        accessLevel,
      };
      
      // Guardar en caché por 15 minutos
      await this.cacheService.set(cacheKey, userContext, 15 * 60);
      
      return userContext;
    } catch (error) {
      this.logger.error(`Error al resolver contexto de usuario: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Resuelve los módulos visibles para un usuario en una compañía
   * @param dto Datos para resolver los módulos
   * @returns Mapa de módulos con sus permisos
   */
  async resolveModules(dto: ResolveModulesDto): Promise<Record<string, any>> {
    try {
      // Obtener el contexto del usuario
      const userContext = await this.resolveUserContext({
        userId: dto.userId,
        token: dto.token,
        companyId: dto.companyId
      });

      // Obtener todos los módulos disponibles
      const modules = await this.moduleModel.find({ isActive: true }).lean();

      // Filtrar módulos según los permisos del usuario
      const accessibleModules = {};
      
      for (const module of modules) {
        const moduleKey = module.code; // Usar code en lugar de key
        const requiredPermission = `${moduleKey}:view`;
        
        // Verificar si el usuario tiene permiso para ver este módulo
        const hasAccess = userContext.permissions.some(p => p === requiredPermission) ||
                         userContext.accessLevel >= 100; // Administrador
        
        if (hasAccess) {
          accessibleModules[moduleKey] = {
            name: module.name,
            description: module.description,
            icon: module.icon,
            order: module.order,
            code: module.code,
            permissions: userContext.permissions
              .filter(p => p.startsWith(moduleKey + ':'))
              .map(p => p.split(':')[1])
          };
        }
      }
      
      return accessibleModules;
    } catch (error) {
      this.logger.error(`Error al resolver módulos: ${error.message}`, error.stack);
      return {};
    }
  }

  /**
   * Verifica si un usuario tiene acceso a un recurso y acción específicos
   * @param dto Datos para verificar el acceso
   * @returns Resultado de la verificación
   */
  async checkAccess(dto: CheckAccessDto): Promise<CheckAccessResponseDto> {
    try {
      // Resolver contexto del usuario
      const userContext = await this.resolveUserContext({
        token: dto.token,
        companyId: dto.companyId,
      });
      
      // Usar el userId del contexto para la clave de caché
      const userId = userContext.userId;
      const cacheKey = this.cacheService.getAccessCheckKey(userId, dto.companyId, dto.resource, dto.action);
      
      // Verificar si ya está en caché
      const cachedResult = await this.cacheService.get<CheckAccessResponseDto>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      
      // Buscar permisos que coincidan con el recurso y acción
      // Los permisos están en formato 'resource:action'
      const permissionKey = `${dto.resource}:${dto.action}`;
      const hasPermission = userContext.permissions.includes(permissionKey);
      
      if (!hasPermission) {
        throw new UnauthorizedException(`Usuario no tiene permiso para ${dto.resource}:${dto.action}`);
      }
      
      // Usar el nivel de acceso del usuario
      const maxLevel = userContext.accessLevel || 50;
      
      // Verificar si cumple con el nivel requerido
      const requiredLevel = dto.requiredLevel ? parseInt(dto.requiredLevel, 10) : 0;
      
      if (maxLevel < requiredLevel) {
        throw new UnauthorizedException(`Nivel de acceso insuficiente para ${dto.resource}:${dto.action}`);
      }
      
      // Construir respuesta
      const response: CheckAccessResponseDto = {
        hasAccess: true,
        userId: userId,
        level: maxLevel,
        message: `Usuario tiene acceso a ${dto.resource}:${dto.action} con nivel ${maxLevel}`,
      };
      
      // Guardar en caché por 15 minutos
      await this.cacheService.set(cacheKey, response, 15 * 60);
      
      return response;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return {
          hasAccess: false,
          userId: dto.userId || 'unknown',
          level: 0,
          message: error.message,
        };
      }
      
      this.logger.error(`Error al verificar acceso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Resuelve los módulos visibles para un usuario en una compañía
   * @param userId ID del usuario
   * @param companyId ID de la compañía
   * @returns Mapa de módulos con sus permisos
   */
  async resolveModulesAccess(userId: string, companyId: string): Promise<Record<string, ModuleAccessDto>> {
    try {
      // Obtener todos los módulos activos
      const modules = await this.moduleModel.find({ isActive: true }).exec();
      
      // Obtener el contexto de usuario para verificar permisos
      const user = await this.userModel.findOne({ userId }).exec();
      
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }
      
      // Obtener las relaciones de usuario-compañía-rol
      const userCompanyRoles = await this.userCompanyRoleModel
        .find({ user: user._id, company: companyId, isActive: true })
        .populate('roles')
        .exec();
      
      if (!userCompanyRoles || userCompanyRoles.length === 0) {
        throw new UnauthorizedException('Usuario no tiene acceso a la compañía especificada');
      }
      
      // Obtener los roles del usuario
      const roleIds = userCompanyRoles.flatMap(ucr => ucr.roles.map(role => role._id));
      
      // Resultado a devolver
      const result: Record<string, ModuleAccessDto> = {};
      
      // Para cada módulo, verificar los permisos
      for (const module of modules) {
        const moduleCode = module.code;
        
        // Verificar permiso de visibilidad
        const canView = await this.hasPermission(roleIds as string[], moduleCode, 'view');
        
        // Si no puede ver el módulo, marcarlo como no visible
        if (!canView) {
          result[moduleCode] = { visible: false };
          continue;
        }
        
        // Si puede ver el módulo, verificar otros permisos
        const canCreate = await this.hasPermission(roleIds as string[], moduleCode, 'create');
        const canRead = await this.hasPermission(roleIds as string[], moduleCode, 'read');
        const canUpdate = await this.hasPermission(roleIds as string[], moduleCode, 'update');
        const canDelete = await this.hasPermission(roleIds as string[], moduleCode, 'delete');
        
        // Agregar el módulo al resultado
        result[moduleCode] = {
          visible: true,
          create: canCreate,
          read: canRead,
          update: canUpdate,
          delete: canDelete,
        };
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error al resolver módulos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verifica si alguno de los roles tiene un permiso específico
   * @param roleIds IDs de los roles
   * @param resource Recurso a verificar
   * @param action Acción a verificar
   * @returns true si tiene permiso, false en caso contrario
   */
  private async hasPermission(roleIds: string[], resource: string, action: string): Promise<boolean> {
    // Buscar permisos que coincidan con el recurso y acción
    const permissions = await this.permissionModel
      .find({ resource, action })
      .exec();
    
    if (!permissions || permissions.length === 0) {
      return false;
    }
    
    const permissionIds = permissions.map(p => p._id);
    
    // Buscar si alguno de los roles tiene el permiso
    const rolePermissions = await this.rolePermissionModel
      .findOne({
        role: { $in: roleIds },
        permission: { $in: permissionIds },
        isActive: true,
      })
      .exec();
    
    return !!rolePermissions;
  }
}
