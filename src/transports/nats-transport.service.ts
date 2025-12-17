import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { NatsConnectionResponse, NatsMessageResponse, NatsBaseResponse } from './types/nats-responses.interface';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class NatsTransportService {
  private readonly logger = new Logger('NatsTransportService');
  private readonly requestTimeout = 10000; // 10 segundos de timeout

  constructor(
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
    @Inject('AUTH_CLIENT') private readonly authClient: ClientProxy,
  ) {}

  /**
   * Envía un mensaje a través de NATS y espera una respuesta
   * @param pattern Patrón del mensaje
   * @param data Datos a enviar
   * @returns Respuesta del mensaje
   */
  async send<T = NatsBaseResponse>(pattern: string, data: any): Promise<T> {
    try {
      return await firstValueFrom(
        this.natsClient.send<T>(pattern, data).pipe(
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
   * Envía un mensaje para envío de WhatsApp
   */
  async sendWhatsAppMessage(data: any): Promise<NatsMessageResponse> {
    return this.send<NatsMessageResponse>('whatsapp.send', data);
  }

  /**
   * Facebook - Enviar mensajes (Messenger)
   */
  async sendFacebookMessage(data: any): Promise<NatsMessageResponse> {
    return this.send<NatsMessageResponse>('send_facebook_message', data);
  }

  /**
   * Facebook - Registro de conexión (exchange token y suscripción)
   */
  async registerFacebookConnection(data: any): Promise<NatsConnectionResponse> {
    return this.send<NatsConnectionResponse>('facebook.connection.register', data);
  }

  /**
   * Facebook - Publicar/editar/borrar publicaciones
   */
  async publishFacebookFeed(data: any): Promise<NatsBaseResponse> {
    return this.send<NatsBaseResponse>('facebook.feed.publish', data);
  }

  /**
   * Facebook - Publicar/editar/borrar comentarios
   */
  async publishFacebookComment(data: any): Promise<NatsBaseResponse> {
    return this.send<NatsBaseResponse>('facebook.comment.publish', data);
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
