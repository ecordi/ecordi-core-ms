import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { UserCompanyRole } from './schemas/user-company-role.schema';
import { CacheService } from '../cache/cache.service';
import { NatsTransportService } from '../transports/nats-transport.service';
import { PasswordGenerator } from '../common/utils/password-generator.util';
import { MailService } from '../mail/mail.service';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserCompanyRole.name) private userCompanyRoleModel: Model<UserCompanyRole>,
    private readonly cacheService: CacheService,
    private readonly natsService: NatsTransportService,
    private readonly mailService: MailService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  /**
   * Busca un usuario por su ID
   * @param userId ID del usuario
   * @returns Usuario encontrado
   */
  async findByUserId(userId: string): Promise<User> {
    const user = await this.userModel.findOne({ userId }).exec();
    
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }
    
    return user;
  }

  /**
   * Busca un usuario por su email
   * @param email Email del usuario
   * @returns Usuario encontrado
   */
  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email }).exec();
    
    if (!user) {
      throw new NotFoundException(`Usuario con email ${email} no encontrado`);
    }
    
    return user;
  }

  /**
   * Crea o actualiza un usuario desde auth-ms
   * @param userData Datos del usuario
   * @returns Usuario creado o actualizado
   */
  async createOrUpdateUser(userData: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    try {
      // Buscar si el usuario ya existe
      let user = await this.userModel.findOne({ userId: userData.userId }).exec();
      
      if (user) {
        // Actualizar usuario existente
        user = await this.userModel.findOneAndUpdate(
          { userId: userData.userId },
          {
            $set: {
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              lastLogin: new Date(),
            },
          },
          { new: true },
        ).exec();
      } else {
        // Crear nuevo usuario
        user = await this.userModel.create({
          userId: userData.userId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          lastLogin: new Date(),
        });
      }
      
      // Limpiar caché relacionada con este usuario
      await this.cacheService.deleteByPattern(`user:context:${userData.userId}:*`);
      
      return user;
    } catch (error) {
      this.logger.error(`Error al crear/actualizar usuario: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Asigna un rol a un usuario en una compañía
   * @param userId ID del usuario
   * @param companyId ID de la compañía
   * @param roleIds IDs de los roles a asignar
   * @returns Relación creada o actualizada
   */
  async assignRolesToUser(
    userId: string,
    companyId: string,
    roleIds: string[],
  ): Promise<UserCompanyRole> {
    try {
      // Buscar el usuario
      const user = await this.findByUserId(userId);
      
      // Buscar si ya existe la relación
      let userCompanyRole = await this.userCompanyRoleModel.findOne({
        user: user._id,
        company: companyId,
      }).exec();
      
      if (userCompanyRole) {
        // Actualizar roles existentes
        userCompanyRole = await this.userCompanyRoleModel.findOneAndUpdate(
          {
            user: user._id,
            company: companyId,
          },
          {
            $set: {
              roles: roleIds,
              isActive: true,
            },
          },
          { new: true },
        ).exec();
      } else {
        // Crear nueva relación
        userCompanyRole = await this.userCompanyRoleModel.create({
          user: user._id,
          company: companyId,
          roles: roleIds,
          assignedAt: new Date(),
        });
      }
      
      // Limpiar caché relacionada con este usuario y compañía
      await this.cacheService.delete(
        this.cacheService.getUserContextKey(userId, companyId),
      );
      
      return userCompanyRole;
    } catch (error) {
      this.logger.error(`Error al asignar roles: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Revoca el acceso de un usuario a una compañía
   * @param userId ID del usuario
   * @param companyId ID de la compañía
   * @returns true si se revocó correctamente
   */
  async revokeCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    try {
      // Buscar el usuario
      const user = await this.findByUserId(userId);
      
      // Desactivar la relación
      const result = await this.userCompanyRoleModel.updateOne(
        {
          user: user._id,
          company: companyId,
        },
        {
          $set: {
            isActive: false,
          },
        },
      ).exec();
      
      // Limpiar caché relacionada con este usuario y compañía
      await this.cacheService.delete(
        this.cacheService.getUserContextKey(userId, companyId),
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Error al revocar acceso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene las compañías a las que tiene acceso un usuario
   * @param userId ID del usuario
   * @returns Lista de compañías con sus roles
   */
  async getUserCompanies(userId: string): Promise<any[]> {
    try {
      // Buscar el usuario
      const user = await this.findByUserId(userId);
      
      // Obtener las relaciones activas
      const userCompanyRoles = await this.userCompanyRoleModel
        .find({
          user: user._id,
          isActive: true,
        })
        .populate('company')
        .populate('roles')
        .exec();
      
      // Transformar el resultado
      return userCompanyRoles.map(ucr => ({
        companyId: ucr.company._id,
        companyName: ucr.company['name'],
        roles: ucr.roles.map(role => ({
          roleId: role._id,
          roleName: role['name'],
        })),
        assignedAt: ucr.assignedAt,
      }));
    } catch (error) {
      this.logger.error(`Error al obtener compañías del usuario: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Crea un nuevo usuario regular y le envía un correo con sus credenciales
   * @param payload Datos del usuario y token del admin
   * @returns Usuario creado sin contraseña
   */
  async createRegularUser(payload: { name: string; email: string; adminToken: string }): Promise<any> {
    try {
      this.logger.debug(`Creando usuario regular: ${JSON.stringify(payload)}`);
      
      // 1. Decodificar el token del admin para obtener su información
      const adminInfo = await firstValueFrom(
        this.authClient.send('auth.validate.token', { token: payload.adminToken })
      );
      
      if (!adminInfo || !adminInfo.companyId) {
        throw new UnauthorizedException('Token de administrador inválido o sin compañía asignada');
      }
      
      // 2. Generar contraseña temporal
      const temporaryPassword = PasswordGenerator.generate();
      
      // 3. Calcular fecha de expiración (24 horas)
      const passwordExpiresAt = new Date();
      passwordExpiresAt.setHours(passwordExpiresAt.getHours() + 24);
      
      // 4. Preparar payload para auth-ms
      const authPayload = {
        email: payload.email,
        password: temporaryPassword,
        name: payload.name,
        companyId: adminInfo.companyId,
        role: 'user', // Rol por defecto para usuarios regulares
        mustChangePassword: true,
        passwordExpiresAt: passwordExpiresAt.toISOString()
      };
      
      this.logger.debug(`Registrando usuario regular en auth-ms: ${payload.email}`);
      
      // 5. Enviar mensaje a auth-ms para registrar el usuario
      const userRegistration = await firstValueFrom(
        this.authClient.send('auth.register.user', authPayload)
      );
      
      // 6. Buscar información de la compañía
      const companyInfo = await this.natsService.send<any>('core.company.find', { companyId: adminInfo.companyId });
      
      if (!companyInfo || !companyInfo.name) {
        this.logger.warn(`No se encontró información de la compañía ${adminInfo.companyId}`);
      }
      
      const companyName = companyInfo?.name || 'la plataforma';
      
      // 7. Enviar correo electrónico de bienvenida al usuario con sus credenciales
      await this.mailService.sendUserWelcomeEmail({
        name: payload.name,
        email: payload.email,
        temporaryPassword,
        expiresAt: passwordExpiresAt,
        companyName
      });
      
      // 8. Devolver información del usuario sin la contraseña
      return {
        userId: userRegistration.userId,
        email: payload.email,
        name: payload.name,
        companyId: adminInfo.companyId,
        companyName,
        role: 'user'
      };
      
    } catch (error) {
      this.logger.error(`Error al crear usuario regular: ${error.message}`);
      throw error;
    }
  }
}
