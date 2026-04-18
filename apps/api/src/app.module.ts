import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { PlayerModule } from './player/player.module';
import { SanctumModule } from './sanctum/sanctum.module';
import { GuildModule } from './guild/guild.module';
import { BattleModule } from './battle/battle.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate Limiting: max 20 richieste per IP ogni 60 secondi
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 20,
    }]),
    SupabaseModule,
    PlayerModule,
    SanctumModule,
    GuildModule,
    BattleModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Applica il rate limiter globalmente a tutti gli endpoint
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }
