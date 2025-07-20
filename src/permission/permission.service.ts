import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission } from './schemas/permission.schema';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger('PermissionService');

  constructor(
    @InjectModel(Permission.name) private permissionModel: Model<Permission>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Crea un nuevo permiso
   * @param permissionData Datos del permiso
   * @returns Permiso creado
   */
  async create(permissionData: {
    resource: string;
    action: string;
    level?: number;
    description?: string;
  }): Promise<Permission> {
    try {
      // Verificar si ya existe un permiso con el mismo resource y action
      const existingPermission = await this.permissionModel.findOne({
        resource: permissionData.resource,
        action: permissionData.action,
      }).exec();
      
      if (existingPermission) {
        throw new Error(`Ya existe un permiso para ${permissionData.resource}:${permissionData.action}`);
      }
      
      // Crear el permiso
      const permission = await this.permissionModel.create({
        ...permissionData,
        level: permissionData.level || 0, // Nivel por defecto
      });
      
      return permission;
    } catch (error) {
      this.logger.error(`Error al crear permiso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Actualiza un permiso existente
   * @param id ID del permiso
   * @param permissionData Datos a actualizar
   * @returns Permiso actualizado
   */
  async update(id: string, permissionData: Partial<Permission>): Promise<Permission> {
    try {
      // Verificar si el permiso existe
      const permission = await this.permissionModel.findById(id).exec();
      
      if (!permission) {
        throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
      }
      
      // Si se intenta actualizar resource o action, verificar que no exista otro permiso con esa combinación
      if ((permissionData.resource && permissionData.resource !== permission.resource) ||
          (permissionData.action && permissionData.action !== permission.action)) {
        
        const existingPermission = await this.permissionModel.findOne({
          resource: permissionData.resource || permission.resource,
          action: permissionData.action || permission.action,
        }).exec();
        
        if (existingPermission && existingPermission._id.toString() !== id) {
          throw new Error(`Ya existe otro permiso para ${permissionData.resource || permission.resource}:${permissionData.action || permission.action}`);
        }
      }
      
      // Actualizar el permiso
      const updatedPermission = await this.permissionModel.findByIdAndUpdate(
        id,
        { $set: permissionData },
        { new: true },
      ).exec();
      
      // Limpiar caché relacionada con permisos
      await this.cacheService.deleteByPattern(`user:context:*`);
      
      return updatedPermission;
    } catch (error) {
      this.logger.error(`Error al actualizar permiso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca un permiso por su ID
   * @param id ID del permiso
   * @returns Permiso encontrado
   */
  async findById(id: string): Promise<Permission> {
    const permission = await this.permissionModel.findById(id).exec();
    
    if (!permission) {
      throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
    }
    
    return permission;
  }

  /**
   * Busca un permiso por resource y action
   * @param resource Recurso
   * @param action Acción
   * @returns Permiso encontrado
   */
  async findByResourceAndAction(resource: string, action: string): Promise<Permission> {
    const permission = await this.permissionModel.findOne({
      resource,
      action,
    }).exec();
    
    if (!permission) {
      throw new NotFoundException(`Permiso para ${resource}:${action} no encontrado`);
    }
    
    return permission;
  }

  /**
   * Obtiene todos los permisos
   * @returns Lista de permisos
   */
  async findAll(): Promise<Permission[]> {
    return this.permissionModel.find().exec();
  }

  /**
   * Obtiene permisos por recurso
   * @param resource Recurso
   * @returns Lista de permisos
   */
  async findByResource(resource: string): Promise<Permission[]> {
    return this.permissionModel.find({ resource }).exec();
  }

  /**
   * Elimina un permiso
   * @param id ID del permiso
   * @returns true si se eliminó correctamente
   */
  async remove(id: string): Promise<boolean> {
    try {
      // Verificar si el permiso existe
      const permission = await this.permissionModel.findById(id).exec();
      
      if (!permission) {
        throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
      }
      
      // Eliminar el permiso
      const result = await this.permissionModel.deleteOne({ _id: id }).exec();
      
      // Limpiar caché relacionada con permisos
      await this.cacheService.deleteByPattern(`user:context:*`);
      
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error(`Error al eliminar permiso: ${error.message}`, error.stack);
      throw error;
    }
  }
}
