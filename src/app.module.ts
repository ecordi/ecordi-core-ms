import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { RoleModule } from './role/role.module';
import { PermissionModule } from './permission/permission.module';
import { AccessControlModule } from './access-control/access-control.module';
import { CacheModule } from './cache/cache.module';
import { TransportsModule } from './transports/transports.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // Conexión a MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
    }),
    
    // Módulos de la aplicación
    UserModule,
    CompanyModule,
    RoleModule,
    PermissionModule,
    AccessControlModule,
    CacheModule,
    TransportsModule,
    MailModule,
  ],
})
export class AppModule {}
