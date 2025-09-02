import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { timeout, firstValueFrom } from 'rxjs';

@Injectable()
export class NatsTransportService {
  private readonly logger = new Logger(NatsTransportService.name);

  constructor(
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
    @Inject('WHATSAPP_CLIENT') private readonly whatsappClient: ClientProxy,
  ) {}

  async send<T = any>(subject: string, payload: any): Promise<T> {
    try {
      const client = this.getClientForSubject(subject);
      const result = await firstValueFrom(
        client.send(subject, payload).pipe(timeout(10000))
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to send NATS message to ${subject}:`, error);
      throw error;
    }
  }

  async publish(subject: string, payload: any): Promise<void> {
    try {
      const client = this.getClientForSubject(subject);
      client.emit(subject, payload);
      this.logger.debug(`Published to ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to publish NATS message to ${subject}:`, error);
      throw error;
    }
  }

  async sendToAuth<T = any>(subject: string, payload: any): Promise<T> {
    return this.send<T>(subject, payload);
  }

  async sendConnectionRegister<T = any>(payload: any): Promise<T> {
    return this.send<T>('whatsapp.connection.register', payload);
  }

  private getClientForSubject(subject: string): ClientProxy {
    if (subject.startsWith('send_whatsapp_message') || subject.startsWith('whatsapp.')) {
      return this.whatsappClient;
    }
    return this.natsClient;
  }
}