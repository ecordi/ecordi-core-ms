import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller()
export class UserController {
  private readonly logger = new Logger('UserController');

  constructor(private readonly userService: UserService) {}

  /**
   * Crea o actualiza un usuario desde auth-ms
   * @param payload Datos del usuario
   * @returns Usuario creado o actualizado
   */
  @MessagePattern('core.user.sync')
  async syncUser(@Payload() payload: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }) {
    this.logger.debug(`Sincronizando usuario: ${JSON.stringify(payload)}`);
    return this.userService.createOrUpdateUser(payload);
  }

  /**
   * Asigna roles a un usuario en una compañía
   * @param payload Datos para asignar roles
   * @returns Relación creada o actualizada
   */
  @MessagePattern('core.user.assignRoles')
  async assignRoles(@Payload() payload: {
    userId: string;
    companyId: string;
    roleIds: string[];
  }) {
    this.logger.debug(`Asignando roles: ${JSON.stringify(payload)}`);
    return this.userService.assignRolesToUser(
      payload.userId,
      payload.companyId,
      payload.roleIds,
    );
  }

  /**
   * Revoca el acceso de un usuario a una compañía
   * @param payload Datos para revocar acceso
   * @returns true si se revocó correctamente
   */
  @MessagePattern('core.user.revokeAccess')
  async revokeAccess(@Payload() payload: {
    userId: string;
    companyId: string;
  }) {
    this.logger.debug(`Revocando acceso: ${JSON.stringify(payload)}`);
    return this.userService.revokeCompanyAccess(
      payload.userId,
      payload.companyId,
    );
  }

  /**
   * Obtiene las compañías a las que tiene acceso un usuario
   * @param payload ID del usuario
   * @returns Lista de compañías con sus roles
   */
  @MessagePattern('core.user.companies')
  async getUserCompanies(@Payload() payload: { userId: string }) {
    this.logger.debug(`Obteniendo compañías del usuario: ${payload.userId}`);
    return this.userService.getUserCompanies(payload.userId);
  }

  /**
   * Crea un nuevo usuario regular y le envía un correo con sus credenciales
   * @param payload Datos del usuario a crear y token del admin
   * @returns Usuario creado
   */
  @MessagePattern('core.user.create')
  async createUser(@Payload() payload: { 
    name: string; 
    email: string; 
    adminToken: string;
  }) {
    this.logger.debug(`Creando usuario regular: ${payload.email}`);
    return this.userService.createRegularUser(payload);
  }
}
