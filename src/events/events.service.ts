import { Injectable } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
  constructor(private readonly gateway: EventsGateway) {}

  emitToCompany(companyId: string, event: string, payload: any) {
    this.gateway.server?.to(`company:${companyId}`).emit(event, payload);
  }

  messageReceived(companyId: string, payload: any) {
    this.emitToCompany(companyId, 'message.received', payload);
  }

  messageSent(companyId: string, payload: any) {
    this.emitToCompany(companyId, 'message.sent', payload);
  }

  messageStatus(companyId: string, payload: any) {
    this.emitToCompany(companyId, 'message.status', payload);
  }

  mediaStored(companyId: string, payload: any) {
    this.emitToCompany(companyId, 'message.media.stored', payload);
  }

  connectionUpdated(companyId: string, payload: any) {
    this.emitToCompany(companyId, 'connection.updated', payload);
  }
}
