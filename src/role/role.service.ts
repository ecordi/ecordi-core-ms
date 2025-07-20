import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './schemas/role.schema';
import { RolePermission } from './schemas/role-permission.schema';
import { Permission } from '../permission/schemas/permission.schema';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class RoleService {
  private readonly logger = new Logger('RoleService');

  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(RolePermission.name) private rolePermissionModel: Model<RolePermission>,
    @InjectModel(Permission.name) private permissionModel: Model<Permission>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Crea un nuevo rol
   * @param roleData Datos del rol
   * @returns Rol creado
   */
  async create(roleData: {
    name: string;
    description?: string;
    isSystemRole?: boolean;
  }): Promise<Role> {
    try {
      // Verificar si ya existe un rol con el mismo nombre
      const existingRole = await this.roleModel.findOne({ name: roleData.name }).exec();
      
      if (existingRole) {
        throw new Error(`Ya existe un rol con el nombre ${roleData.name}`);
      }
      
      // Crear el rol
      const role = await this.roleModel.create(roleData);
      
      return role;
    } catch (error) {
      this.logger.error(`Error al crear rol: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Actualiza un rol existente
   * @param id ID del rol
   * @param roleData Datos a actualizar
   * @returns Rol actualizado
   */
  async update(id: string, roleData: Partial<Role>): Promise<Role> {
    try {
      // Verificar si el rol existe
      const role = await this.roleModel.findById(id).exec();
      
      if (!role) {
        throw new NotFoundException(`Rol con ID ${id} no encontrado`);
      }
      
      // Si se intenta actualizar el nombre, verificar que no exista otro rol con ese nombre
      if (roleData.name && roleData.name !== role.name) {
        const existingRole = await this.roleModel.findOne({ name: roleData.name }).exec();
        
        if (existingRole && existingRole._id.toString() !== id) {
          throw new Error(`Ya existe otro rol con el nombre ${roleData.name}`);
        }
      }
      
      // Actualizar el rol
      const updatedRole = await this.roleModel.findByIdAndUpdate(
        id,
        { $set: roleData },
        { new: true },
      ).exec();
      
      // Limpiar caché relacionada con este rol
      await this.cacheService.deleteByPattern(`user:context:*`);
      
      return updatedRole;
    } catch (error) {
      this.logger.error(`Error al actualizar rol: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca un rol por su ID
   * @param id ID del rol
   * @returns Rol encontrado
   */
  async findById(id: string): Promise<Role> {
    const role = await this.roleModel.findById(id).exec();
    
    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }
    
    return role;
  }

  /**
   * Busca un rol por su nombre
   * @param name Nombre del rol
   * @returns Rol encontrado
   */
  async findByName(name: string): Promise<Role> {
    const role = await this.roleModel.findOne({ name }).exec();
    
    if (!role) {
      throw new NotFoundException(`Rol con nombre ${name} no encontrado`);
    }
    
    return role;
  }

  /**
   * Obtiene todos los roles activos
   * @returns Lista de roles
   */
  async findAll(): Promise<Role[]> {
    return this.roleModel.find({ isActive: true }).exec();
  }

  /**
   * Asigna permisos a un rol
   * @param roleId ID del rol
   * @param permissionIds IDs de los permisos a asignar
   * @returns Lista de relaciones rol-permiso creadas
   */
  async assignPermissions(roleId: string, permissionIds: string[]): Promise<RolePermission[]> {
    try {
      // Verificar si el rol existe
      const role = await this.roleModel.findById(roleId).exec();
      
      if (!role) {
        throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
      }
      
      // Verificar si los permisos existen
      const permissions = await this.permissionModel.find({
        _id: { $in: permissionIds },
      }).exec();
      
      if (permissions.length !== permissionIds.length) {
        throw new Error('Uno o más permisos no existen');
      }
      
      // Eliminar asignaciones existentes
      await this.rolePermissionModel.deleteMany({ role: roleId }).exec();
      
      // Crear nuevas asignaciones
      const rolePermissions = await Promise.all(
        permissionIds.map(async (permissionId) => {
          return this.rolePermissionModel.create({
            role: roleId,
            permission: permissionId,
          });
        }),
      );
      
      // Limpiar caché relacionada con este rol
      await this.cacheService.deleteByPattern(`user:context:*`);
      
      return rolePermissions;
    } catch (error) {
      this.logger.error(`Error al asignar permisos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene los permisos asignados a un rol
   * @param roleId ID del rol
   * @returns Lista de permisos
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      // Verificar si el rol existe
      const role = await this.roleModel.findById(roleId).exec();
      
      if (!role) {
        throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
      }
      
      // Obtener las relaciones rol-permiso
      const rolePermissions = await this.rolePermissionModel
        .find({ role: roleId, isActive: true })
        .populate('permission')
        .exec();
      
      // Extraer los permisos
      return rolePermissions.map(rp => rp.permission);
    } catch (error) {
      this.logger.error(`Error al obtener permisos del rol: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Desactiva un rol
   * @param id ID del rol
   * @returns true si se desactivó correctamente
   */
  async deactivate(id: string): Promise<boolean> {
    try {
      // Verificar si el rol existe
      const role = await this.roleModel.findById(id).exec();
      
      if (!role) {
        throw new NotFoundException(`Rol con ID ${id} no encontrado`);
      }
      
      // No permitir desactivar roles del sistema
      if (role.isSystemRole) {
        throw new Error('No se pueden desactivar roles del sistema');
      }
      
      // Desactivar el rol
      const result = await this.roleModel.updateOne(
        { _id: id },
        { $set: { isActive: false } },
      ).exec();
      
      // Limpiar caché relacionada con este rol
      await this.cacheService.deleteByPattern(`user:context:*`);
      
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Error al desactivar rol: ${error.message}`, error.stack);
      throw error;
    }
  }
}
