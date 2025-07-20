import { Inject, Injectable, InternalServerErrorException, BadRequestException, Logger, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Company } from './schemas/company.schema';
import { CreateCompanyWithAdminDto } from './dto/create-company-with-admin.dto';
import { CustomException, DuplicateResourceException, ResourceNotFoundException } from '../common/exceptions/custom-exceptions';
import { PasswordGenerator } from '../common/utils/password-generator.util';
import { MailService } from '../mail/mail.service';
import { CacheService } from '../cache/cache.service';
import { AuthRegisterUserPayload } from './interfaces/auth-register-user.interface';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
  ) { }

  // /**
  //  * Crea una nueva compañía
  //  * @param companyData Datos de la compañía
  //  * @returns Compañía creada
  //  */
  // async create(companyData: {
  //   name: string;
  //   taxId: string;
  //   description?: string;
  //   address?: string;
  //   phone?: string;
  //   email?: string;
  //   website?: string;
  // }): Promise<Company> {
  //   try {
  //     // Verificar si ya existe una compañía con el mismo taxId
  //     const existingCompany = await this.companyModel.findOne({ taxId: companyData.taxId }).exec();

  //     if (existingCompany) {
  //       throw new DuplicateResourceException(`Ya existe una compañía con el taxId ${companyData.taxId}`);
  //     }
  //     this.logger.debug(`Creando compañía: ${JSON.stringify(companyData)}`);

  //     // Crear la compañía
  //     const company = await this.companyModel.create(companyData);
  //     console.log("🚀 ~ file: company.service.ts:49 ~ company:", company)

  //     return company;
  //   } catch (error) {
  //     this.logger.error(`Error al crear compañía: ${error.message}`, error.stack);

  //     if (error instanceof DuplicateResourceException) {
  //       throw error;
  //     }

  //     throw new InternalServerErrorException(`Error al crear la compañía: ${error.message}`);
  //   }
  // }

  /**
   * Actualiza una compañía existente
   * @param id ID de la compañía
   * @param companyData Datos a actualizar
   * @returns Compañía actualizada
   */
  async update(id: string, companyData: Partial<Company>): Promise<Company> {
    try {
      // Verificar si la compañía existe
      const company = await this.companyModel.findById(id).exec();

      if (!company) {
        throw new ResourceNotFoundException(`Compañía con ID ${id} no encontrada`);
      }

      // Si se intenta actualizar el taxId, verificar que no exista otra compañía con ese taxId
      if (companyData.taxId && companyData.taxId !== company.taxId) {
        const existingCompany = await this.companyModel.findOne({ taxId: companyData.taxId }).exec();

        if (existingCompany && existingCompany._id.toString() !== id) {
          throw new DuplicateResourceException(`Ya existe otra compañía con el taxId ${companyData.taxId}`);
        }
      }

      // Actualizar la compañía
      const updatedCompany = await this.companyModel.findByIdAndUpdate(
        id,
        { $set: companyData },
        { new: true },
      ).exec();

      // Limpiar caché relacionada con esta compañía
      await this.cacheService.deleteByPattern(`*:company:${id}`);

      return updatedCompany;
    } catch (error) {
      this.logger.error(`Error al actualizar compañía: ${error.message}`, error.stack);

      if (error instanceof ResourceNotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Error al actualizar la compañía: ${error.message}`);
    }
  }

  /**
   * Busca una compañía por su ID
   * @param id ID de la compañía
   * @returns Compañía encontrada
   */
  async findById(id: string): Promise<Company> {
    const company = await this.companyModel.findById(id).exec();

    if (!company) {
      throw new ResourceNotFoundException(`Compañía con ID ${id} no encontrada`);
    }

    return company;
  }

  /**
   * Busca una compañía por su taxId
   * @param taxId Identificación fiscal de la compañía
   * @returns Compañía encontrada
   */
  /**
   * Crea una compañía con un usuario administrador
   * @param dto Datos de la compañía y del administrador
   * @returns Compañía creada y respuesta del registro de usuario
   */
  async create(dto: CreateCompanyWithAdminDto): Promise<{
    company: Company;
    userRegistration: any;
  }> {
    try {
      // Verificar si ya existe una compañía con el mismo taxId
      const existingCompany = await this.companyModel.findOne({ taxId: dto.taxId }).exec();

      if (existingCompany) {
        throw new DuplicateResourceException(`Ya existe una compañía con el taxId ${dto.taxId}`);
      }

      // Preparar datos de la compañía pero no crearla todavía
      const companyData = {
        name: dto.name,
        taxId: dto.taxId,
        description: dto.description,
        address: dto.address,
        phone: dto.phone,
        email: dto.companyEmail,
        website: dto.website
      };

      // Generar contraseña temporal
      const temporaryPassword = PasswordGenerator.generate(12);

      // Calcular fecha de expiración (24 horas desde ahora)
      const passwordExpiresAt = new Date();
      passwordExpiresAt.setHours(passwordExpiresAt.getHours() + 24);

      // Crear la compañía en MongoDB sin usar transacciones
      this.logger.debug(`Creando compañía con administrador: ${JSON.stringify(companyData)}`);
      const company = await this.companyModel.create(companyData);

      // Preparar payload para auth-ms
      const authPayload: AuthRegisterUserPayload = {
        email: dto.adminEmail,
        password: temporaryPassword,
        name: dto.adminName,
        companyId: company._id.toString(),
        role: 'admin',
        mustChangePassword: true,
        passwordExpiresAt: passwordExpiresAt.toISOString()
      };

      this.logger.debug(`Registrando usuario administrador: ${dto.adminEmail} para compañía: ${company._id}`);

      try {
        // Enviar mensaje a auth-ms para registrar el usuario
        const userRegistration = await firstValueFrom(
          this.authClient.send('auth.register.user', authPayload)
        );

        // Si llegamos aquí, el usuario se registró correctamente

        // Enviar correo electrónico de bienvenida al administrador con sus credenciales
        await this.mailService.sendAdminWelcomeEmail({
          name: dto.adminName,
          email: dto.adminEmail,
          temporaryPassword,
          expiresAt: passwordExpiresAt,
          companyName: company.name
        });

        // No incluir las credenciales en la respuesta
        return {
          company,
          userRegistration
        };
      } catch (innerError) {
        // Si hay un error al registrar el usuario, intentar eliminar la compañía creada
        try {
          await this.companyModel.findByIdAndDelete(company._id);
          this.logger.debug(`Compañía ${company._id} eliminada debido a error en registro de usuario`);
        } catch (deleteError) {
          this.logger.error(`Error al eliminar compañía ${company._id}: ${deleteError.message}`);
        }

        // Verificar si es un error de usuario existente
        if (innerError.message && innerError.message.includes('User already exists')) {
          throw new BadRequestException(`El usuario administrador con email ${dto.adminEmail} ya existe en el sistema`);
        }

        throw innerError;
      }
    } catch (error) {
      this.logger.error(`221-Error al crear compañía: ${error.message}`, error.stack);

      // Si ya es una RpcException, relanzala
      if (error instanceof RpcException) {
        throw error;
      }

      // Si viene serializado como objeto plano (status + message), reconstruí la RpcException
      if (typeof error?.status === 'number' && typeof error?.message === 'string') {
        throw new RpcException({ status: error.status, message: error.message });
      }

      // Fallback: error inesperado
      throw new RpcException({ status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error inesperado al crear compañía' });
    }
  }

  async findByTaxId(taxId: string): Promise<Company> {
    const company = await this.companyModel.findOne({ taxId }).exec();

    if (!company) {
      throw new ResourceNotFoundException(`Compañía con taxId ${taxId} no encontrada`);
    }

    return company;
  }

  /**
   * Obtiene todas las compañías activas
   * @returns Lista de compañías
   */
  async findAll(): Promise<Company[]> {
    return this.companyModel.find({ isActive: true }).exec();
  }

  /**
   * Desactiva una compañía
   * @param id ID de la compañía
   * @returns true si se desactivó correctamente
   */
  async deactivate(id: string): Promise<boolean> {
    try {
      // Verificar si la compañía existe
      const company = await this.companyModel.findById(id).exec();

      if (!company) {
        throw new ResourceNotFoundException(`Compañía con ID ${id} no encontrada`);
      }

      // Desactivar la compañía
      const result = await this.companyModel.updateOne(
        { _id: id },
        { $set: { isActive: false } },
      ).exec();

      // Limpiar caché relacionada con esta compañía
      await this.cacheService.deleteByPattern(`*:company:${id}`);

      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Error al desactivar compañía: ${error.message}`, error.stack);

      if (error instanceof ResourceNotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Error al desactivar la compañía: ${error.message}`);
    }
  }
}
