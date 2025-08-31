import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { NatsConnectionResponse, NatsMessageResponse, NatsBaseResponse } from './types/nats-responses.interface';

@Injectable()
export class NatsTransportService {
  private readonly logger = new Logger('NatsTransportService');
  private readonly requestTimeout = 30000; // 30 segundos de timeout para operaciones complejas

  constructor(
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
    @Inject('AUTH_CLIENT') private readonly authClient: ClientProxy,
    @Inject('WHATSAPP_CLIENT') private readonly whatsappClient: ClientProxy,
  ) {}

  /**
   * Envía un mensaje a través de NATS y espera una respuesta
   * @param pattern Patrón del mensaje
   * @param data Datos a enviar
   * @returns Respuesta del mensaje
   */
  async send<T = NatsBaseResponse>(pattern: string, data: any): Promise<T> {
    try {
      // Use WhatsApp client for WhatsApp-related messages
      const client = pattern.includes('whatsapp') ? this.whatsappClient : this.natsClient;
      
      return await firstValueFrom(
        client.send<T>(pattern, data).pipe(
          timeout(this.requestTimeout),
        ),
      );
    } catch (error) {
      this.logger.error(`Error sending message to ${pattern}`, error);
      throw error;
    }
  }

  /**
   * Envía mensaje de registro de conexión WhatsApp
   */
  async sendConnectionRegister(data: any): Promise<NatsConnectionResponse> {
    return this.send<NatsConnectionResponse>('register_whatsapp_connection', data);
  }

  /**
   * Envía mensaje para envío de WhatsApp
   */
  async sendWhatsAppMessage(data: any): Promise<NatsMessageResponse> {
    return this.send<NatsMessageResponse>('whatsapp.send', data);
  }

  /**
   * Envía un mensaje al servicio de autenticación y espera una respuesta
   * @param pattern Patrón del mensaje
   * @param data Datos a enviar
   * @returns Respuesta del mensaje
   */
  async sendToAuth<T>(pattern: string, data: any): Promise<T> {
    try {
      return await firstValueFrom(
        this.authClient.send<T>(pattern, data).pipe(
          timeout(this.requestTimeout),
        ),
      );
    } catch (error) {
      this.logger.error(`Error sending message to auth service: ${pattern}`, error);
      throw error;
    }
  }

  /**
   * Publica un evento a través de NATS
   * @param pattern Patrón del evento
   * @param data Datos a publicar
   */
  async publish(pattern: string, data: any): Promise<void> {
    try {
      this.natsClient.emit(pattern, data);
      this.logger.debug(`Event published: ${pattern}`);
    } catch (error) {
      this.logger.error(`Error publishing event to ${pattern}`, error);
      throw error;
    }
  }
}
