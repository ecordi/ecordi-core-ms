import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [ConfigModule, CacheModule],
  controllers: [OauthController],
  providers: [OauthService],
})
export class OauthModule {}
