import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RoleService } from './role.service';
import { Role } from './schemas/role.schema';
import { Permission } from '../permission/schemas/permission.schema';

@Controller()
export class RoleController {
  private readonly logger = new Logger('RoleController');

  constructor(private readonly roleService: RoleService) {}

  /**
   * Crea un nuevo rol
   * @param payload Datos del rol
   * @returns Rol creado
   */
  @MessagePattern('core.role.create')
  async create(@Payload() payload: {
    name: string;
    description?: string;
    isSystemRole?: boolean;
  }): Promise<Role> {
    this.logger.debug(`Creando rol: ${JSON.stringify(payload)}`);
    return this.roleService.create(payload);
  }

  /**
   * Actualiza un rol existente
   * @param payload Datos a actualizar
   * @returns Rol actualizado
   */
  @MessagePattern('core.role.update')
  async update(@Payload() payload: {
    id: string;
    data: Partial<Role>;
  }): Promise<Role> {
    this.logger.debug(`Actualizando rol ${payload.id}`);
    return this.roleService.update(payload.id, payload.data);
  }

  /**
   * Busca un rol por su ID
   * @param payload ID del rol
   * @returns Rol encontrado
   */
  @MessagePattern('core.role.findById')
  async findById(@Payload() payload: { id: string }): Promise<Role> {
    return this.roleService.findById(payload.id);
  }

  /**
   * Busca un rol por su nombre
   * @param payload Nombre del rol
   * @returns Rol encontrado
   */
  @MessagePattern('core.role.findByName')
  async findByName(@Payload() payload: { name: string }): Promise<Role> {
    return this.roleService.findByName(payload.name);
  }

  /**
   * Obtiene todos los roles activos
   * @returns Lista de roles
   */
  @MessagePattern('core.role.findAll')
  async findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  /**
   * Asigna permisos a un rol
   * @param payload Datos para asignar permisos
   * @returns true si se asignaron correctamente
   */
  @MessagePattern('core.role.assignPermissions')
  async assignPermissions(@Payload() payload: {
    roleId: string;
    permissionIds: string[];
  }): Promise<boolean> {
    this.logger.debug(`Asignando permisos al rol ${payload.roleId}`);
    const result = await this.roleService.assignPermissions(
      payload.roleId,
      payload.permissionIds,
    );
    return result.length > 0;
  }

  /**
   * Obtiene los permisos asignados a un rol
   * @param payload ID del rol
   * @returns Lista de permisos
   */
  @MessagePattern('core.role.permissions')
  async getRolePermissions(@Payload() payload: { roleId: string }): Promise<Permission[]> {
    return this.roleService.getRolePermissions(payload.roleId);
  }

  /**
   * Desactiva un rol
   * @param payload ID del rol
   * @returns true si se desactivó correctamente
   */
  @MessagePattern('core.role.deactivate')
  async deactivate(@Payload() payload: { id: string }): Promise<boolean> {
    this.logger.debug(`Desactivando rol ${payload.id}`);
    return this.roleService.deactivate(payload.id);
  }
}
