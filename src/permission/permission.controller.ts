import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PermissionService } from './permission.service';
import { Permission } from './schemas/permission.schema';

@Controller()
export class PermissionController {
  private readonly logger = new Logger('PermissionController');

  constructor(private readonly permissionService: PermissionService) {}

  /**
   * Crea un nuevo permiso
   * @param payload Datos del permiso
   * @returns Permiso creado
   */
  @MessagePattern('core.permission.create')
  async create(@Payload() payload: {
    resource: string;
    action: string;
    level?: number;
    description?: string;
  }): Promise<Permission> {
    this.logger.debug(`Creando permiso: ${JSON.stringify(payload)}`);
    return this.permissionService.create(payload);
  }

  /**
   * Actualiza un permiso existente
   * @param payload Datos a actualizar
   * @returns Permiso actualizado
   */
  @MessagePattern('core.permission.update')
  async update(@Payload() payload: {
    id: string;
    data: Partial<Permission>;
  }): Promise<Permission> {
    this.logger.debug(`Actualizando permiso ${payload.id}`);
    return this.permissionService.update(payload.id, payload.data);
  }

  /**
   * Busca un permiso por su ID
   * @param payload ID del permiso
   * @returns Permiso encontrado
   */
  @MessagePattern('core.permission.findById')
  async findById(@Payload() payload: { id: string }): Promise<Permission> {
    return this.permissionService.findById(payload.id);
  }

  /**
   * Busca un permiso por resource y action
   * @param payload Datos para buscar el permiso
   * @returns Permiso encontrado
   */
  @MessagePattern('core.permission.findByResourceAndAction')
  async findByResourceAndAction(@Payload() payload: {
    resource: string;
    action: string;
  }): Promise<Permission> {
    return this.permissionService.findByResourceAndAction(
      payload.resource,
      payload.action,
    );
  }

  /**
   * Obtiene todos los permisos
   * @returns Lista de permisos
   */
  @MessagePattern('core.permission.findAll')
  async findAll(): Promise<Permission[]> {
    return this.permissionService.findAll();
  }

  /**
   * Obtiene permisos por recurso
   * @param payload Recurso
   * @returns Lista de permisos
   */
  @MessagePattern('core.permission.findByResource')
  async findByResource(@Payload() payload: { resource: string }): Promise<Permission[]> {
    return this.permissionService.findByResource(payload.resource);
  }

  /**
   * Elimina un permiso
   * @param payload ID del permiso
   * @returns true si se eliminó correctamente
   */
  @MessagePattern('core.permission.remove')
  async remove(@Payload() payload: { id: string }): Promise<boolean> {
    this.logger.debug(`Eliminando permiso ${payload.id}`);
    return this.permissionService.remove(payload.id);
  }
}
