import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();
    // Accept token via query or headers
    const token = (client.handshake.query.token as string) || (client.handshake.headers['authorization']?.toString().replace(/^Bearer\s+/i, '') ?? '');
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      const secret = this.config.get<string>('JWT_SECRET') || 'dev_secret';
      const payload: any = jwt.verify(token, secret);
      const companyId = payload?.companyId || payload?.cid;
      if (!companyId) throw new UnauthorizedException('Missing companyId in token');
      (client as any).companyId = companyId;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
