import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { PlayerModule } from './player/player.module';
import { SanctumModule } from './sanctum/sanctum.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    PlayerModule,
    SanctumModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
