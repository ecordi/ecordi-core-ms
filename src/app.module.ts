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
// New modules
import { ConnectionsModule } from './connections/connections.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { WebhookModule } from './webhook/webhook.module';
import { EventsModule } from './events/events.module';
import { WorkersModule } from './workers/workers.module';
import { OauthModule } from './oauth/oauth.module';
import { ChannelsModule } from './channels/channels.module';
import { MessagingModule } from './messaging/messaging.module';
import { TasksModule } from './tasks/tasks.module';
import { InstagramModule } from './instagram/instagram.module';
import { FacebookModule } from './facebook/facebook.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
        uri: configService.get<string>('MONGO_URI') || configService.get<string>('MONGODB_URI'),
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
    // New feature modules
    EventsModule,
    ConnectionsModule,
    WhatsAppModule,
    WebhookModule,
    WorkersModule,
    OauthModule,
    ChannelsModule,
    TasksModule,
    MessagingModule,
    InstagramModule,
    FacebookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
