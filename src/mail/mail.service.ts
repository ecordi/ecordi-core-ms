import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface AdminWelcomeEmailData {
  name: string;
  email: string;
  temporaryPassword: string;
  expiresAt: Date;
  companyName: string;
}

interface UserWelcomeEmailData {
  name: string;
  email: string;
  companyName: string;
  temporaryPassword: string;
  expiresAt: Date;
}

interface EmailApiRequest {
  from: string;
  to: string[];
  subject: string;
  body: string;
  attachments?: any[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly loginUrl: string;
  
  constructor(private readonly configService: ConfigService) {
    // En un entorno real, estas configuraciones vendrían del ConfigService
    // Usamos el nombre del servicio en la red Docker
    const emailHost = process.env.EMAIL_SERVICE_HOST || 'email-service';
    const emailPort = process.env.EMAIL_SERVICE_PORT || '3020';
    this.apiUrl = `http://${emailHost}:${emailPort}/api/emails`;
    this.apiKey = 'cgnj upei npfr avhf';
    this.fromEmail = 'cordi96@gmail.com';
    this.loginUrl = 'http://localhost:3000/login'; // URL de inicio de sesión
    
    this.logger.log(`Servicio de email configurado en: ${this.apiUrl}`);
  }
  
  /**
   * Envía un correo electrónico de bienvenida al administrador con sus credenciales
   * @param data Datos para el correo electrónico
   */
  async sendAdminWelcomeEmail(data: AdminWelcomeEmailData): Promise<void> {
    try {
      // Formatear la fecha de expiración
      const expirationDate = data.expiresAt.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Obtener el año actual para el footer
      const currentYear = new Date().getFullYear();
      
      // Generar el HTML del correo electrónico usando el template
      const emailHtml = this.getAdminWelcomeTemplate({
        userName: data.name,
        companyName: data.companyName,
        passwordExpirationDate: expirationDate,
        loginUrl: this.loginUrl,
        adminEmail: data.email,
        year: currentYear.toString(),
        temporaryPassword: data.temporaryPassword
      });
      
      // Configurar la solicitud a la API de correo
      const emailRequest: EmailApiRequest = {
        from: this.fromEmail,
        to: [data.email],
        subject: `Bienvenido a ${data.companyName} - Credenciales de acceso`,
        body: emailHtml
      };
      
      // Registrar el intento de envío en los logs
      this.logger.log(`Enviando correo electrónico de bienvenida a ${data.email}`);
      this.logger.log(`URL del servicio de email: ${this.apiUrl}`);
      this.logger.log(`Datos de la solicitud: ${JSON.stringify(emailRequest)}`);
      
      try {
        // Enviar el correo electrónico a través de la API
        const response = await axios.post(this.apiUrl, emailRequest, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          }
        });
        
        this.logger.log(`Correo electrónico enviado correctamente: ${response.status}`);
        this.logger.log(`Respuesta: ${JSON.stringify(response.data)}`);
      } catch (error) {
        if (error.response) {
          // La solicitud se realizó y el servidor respondió con un código de estado
          // que no está en el rango 2xx
          this.logger.error(`Error de respuesta: ${error.response.status}`);
          this.logger.error(`Datos de error: ${JSON.stringify(error.response.data)}`);
          this.logger.error(`Cabeceras: ${JSON.stringify(error.response.headers)}`);
        } else if (error.request) {
          // La solicitud se realizó pero no se recibió respuesta
          this.logger.error(`No se recibió respuesta: ${error.request}`);
        } else {
          // Algo sucedió al configurar la solicitud que desencadenó un error
          this.logger.error(`Error de configuración: ${error.message}`);
        }
        throw error;
      }
      
      // También mostrar las credenciales en el log para facilitar las pruebas
      this.logger.log('==================================================');
      this.logger.log('CREDENCIALES DEL ADMINISTRADOR:');
      this.logger.log(`Email: ${data.email}`);
      this.logger.log(`Contraseña temporal: ${data.temporaryPassword}`);
      this.logger.log(`Expira el: ${data.expiresAt.toLocaleString()}`);
      this.logger.log('==================================================');
      
    } catch (error) {
      this.logger.error(`Error al enviar correo electrónico: ${error.message}`);
      
      // Mostrar las credenciales en el log en caso de error para no perderlas
      this.logger.log('==================================================');
      this.logger.log('CREDENCIALES DEL ADMINISTRADOR (ERROR AL ENVIAR EMAIL):');
      this.logger.log(`Email: ${data.email}`);
      this.logger.log(`Contraseña temporal: ${data.temporaryPassword}`);
      this.logger.log(`Expira el: ${data.expiresAt.toLocaleString()}`);
      this.logger.log('==================================================');
      
      // No lanzamos la excepción para no interrumpir el flujo principal
      // pero registramos el error para su seguimiento
    }
  }

  /**
   * Envía un correo electrónico de bienvenida a un usuario regular con sus credenciales
   * @param data Datos del usuario y su contraseña temporal
   */
  async sendUserWelcomeEmail(data: UserWelcomeEmailData): Promise<void> {
    try {
      // Formatear la fecha de expiración
      const expirationDate = data.expiresAt.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Obtener el año actual para el footer
      const currentYear = new Date().getFullYear().toString();
      
      // Generar el HTML del correo electrónico usando el template
      const emailHtml = this.getEmailTemplate('user-welcome', {
        userName: data.name,
        email: data.email,
        companyName: data.companyName,
        temporaryPassword: data.temporaryPassword,
        passwordExpirationDate: expirationDate,
        loginUrl: this.loginUrl,
        year: currentYear
      });
      
      // Configurar la solicitud a la API de correo
      const emailRequest: EmailApiRequest = {
        from: this.fromEmail,
        to: [data.email],
        subject: `Bienvenido a ${data.companyName} - Tu cuenta ha sido creada`,
        body: emailHtml
      };
      
      // Registrar el intento de envío en los logs
      this.logger.log(`Enviando correo electrónico de bienvenida a usuario regular: ${data.email}`);
      
      try {
        // Enviar el correo electrónico a través de la API
        const response = await axios.post(this.apiUrl, emailRequest, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          }
        });
        
        this.logger.log(`Correo electrónico enviado correctamente: ${response.status}`);
      } catch (error) {
        if (error.response) {
          this.logger.error(`Error de respuesta: ${error.response.status}`);
          this.logger.error(`Datos de error: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          this.logger.error(`No se recibió respuesta: ${error.request}`);
        } else {
          this.logger.error(`Error de configuración: ${error.message}`);
        }
        throw error;
      }
      
      // También mostrar las credenciales en el log para facilitar las pruebas
      this.logger.log('==================================================');
      this.logger.log('CREDENCIALES DEL USUARIO:');
      this.logger.log(`Email: ${data.email}`);
      this.logger.log(`Contraseña temporal: ${data.temporaryPassword}`);
      this.logger.log(`Expira el: ${data.expiresAt.toLocaleString()}`);
      this.logger.log('==================================================');
      
    } catch (error) {
      this.logger.error(`Error al enviar correo electrónico: ${error.message}`);
      
      // Mostrar las credenciales en el log en caso de error para no perderlas
      this.logger.log('==================================================');
      this.logger.log('CREDENCIALES DEL USUARIO (ERROR AL ENVIAR EMAIL):');
      this.logger.log(`Email: ${data.email}`);
      this.logger.log(`Contraseña temporal: ${data.temporaryPassword}`);
      this.logger.log(`Expira el: ${data.expiresAt.toLocaleString()}`);
      this.logger.log('==================================================');
      
      // No lanzamos la excepción para no interrumpir el flujo principal
      // pero registramos el error para su seguimiento
    }
  }
  
  /**
   * Obtiene un template de correo electrónico por su nombre y reemplaza las variables
   * @param templateName Nombre del template (sin extensión)
   * @param data Datos para reemplazar en el template
   * @returns HTML del correo electrónico
   */
  private getEmailTemplate(templateName: string, data: Record<string, string>): string {
    try {
      // Determinar la ruta base según el entorno (desarrollo o producción)
      let basePath;
      if (process.env.NODE_ENV === 'production') {
        // En producción (Docker), los archivos están en /app/dist/mail/templates
        basePath = path.join(process.cwd(), 'dist', 'mail', 'templates');
      } else {
        // En desarrollo, usar __dirname
        basePath = path.join(__dirname, 'templates');
      }
      
      // Ruta completa al archivo de template
      const templatePath = path.join(basePath, `${templateName}.html`);
      this.logger.log(`Intentando cargar template desde: ${templatePath}`);
      
      // Leer el contenido del archivo
      let templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Reemplazar todas las variables en el template (formato {{variable}})
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`\{\{${key}\}\}`, 'g');
        templateContent = templateContent.replace(regex, data[key]);
      });
      
      return templateContent;
    } catch (error) {
      this.logger.error(`Error al leer el template ${templateName}: ${error.message}`);
      throw new Error(`No se pudo cargar el template de correo electrónico: ${error.message}`);
    }
  }
  
  /**
   * Genera el template HTML para el correo de bienvenida del administrador
   * @param data Datos para el template
   * @returns HTML del correo electrónico
   */
  private getAdminWelcomeTemplate(data: {
    userName: string;
    companyName: string;
    passwordExpirationDate: string;
    loginUrl: string;
    year: string;
    temporaryPassword: string;
    adminEmail: string;
  }): string {
    // Convertir los datos al formato esperado por getEmailTemplate
    const templateData = {
      userName: data.userName,
      email: data.adminEmail, // Usamos el nombre como email para mantener compatibilidad
      companyName: data.companyName,
      passwordExpirationDate: data.passwordExpirationDate,
      loginUrl: data.loginUrl,
      year: data.year,
      temporaryPassword: data.temporaryPassword
    };
    
    return this.getEmailTemplate('admin-welcome', templateData);
  }
}
