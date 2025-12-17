import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import { CacheModule } from '../cache/cache.module';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [ConfigModule, CacheModule, forwardRef(() => ConnectionsModule)],
  controllers: [OauthController],
  providers: [OauthService],
  exports: [OauthService],
})
export class OauthModule {}
