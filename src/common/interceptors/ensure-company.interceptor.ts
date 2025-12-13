import { CallHandler, ExecutionContext, Injectable, NestInterceptor, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class EnsureCompanyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest() as any;
    const companyId = req?.user?.companyId;
    if (!companyId) {
      throw new UnauthorizedException('Missing company context in JWT');
    }
    req.companyId = companyId;
    return next.handle();
  }
}
