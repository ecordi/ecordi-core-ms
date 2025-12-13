import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Observable, from, switchMap } from 'rxjs';

interface WebhookEventDoc {
  channel: string;
  remoteId: string;
  companyId: string;
  idempotencyKey?: string;
  receivedAt: Date;
  rawPayload: any;
  status: string;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectModel('WebhookEvent') private readonly webhookEvents: Model<WebhookEventDoc>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest() as any;

    const key = req.headers['idempotency-key'] as string | undefined;
    if (!key) {
      throw new BadRequestException('Missing Idempotency-Key header');
    }
    const parts = key.split(':');
    if (parts.length < 3) {
      throw new BadRequestException('Invalid Idempotency-Key format');
    }
    const [companyId, connectionId, remoteId] = parts;
    if (!companyId || !remoteId) {
      throw new BadRequestException('Invalid Idempotency-Key values');
    }

    const channel = req.headers['x-channel'] || req.body?.channelType || 'unknown';

    return from(
      this.webhookEvents.findOne({ companyId, remoteId, channel }).lean(),
    ).pipe(
      switchMap((found) => {
        if (found) {
          throw new ConflictException('Duplicate event (idempotency)');
        }
        return from(
          this.webhookEvents.create({
            companyId,
            remoteId,
            channel,
            idempotencyKey: key,
            receivedAt: new Date(),
            rawPayload: req.body,
            status: 'pending',
          }),
        ).pipe(switchMap(() => next.handle()));
      }),
    );
  }
}
