import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

@Injectable()
export class StrictValidationPipe extends ValidationPipe implements PipeTransform<any> {
  constructor(options: ValidationPipeOptions = {}) {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: (errors) => new BadRequestException({ message: 'Validation failed', errors }),
      ...options,
    });
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    return super.transform(value, metadata);
  }
}
