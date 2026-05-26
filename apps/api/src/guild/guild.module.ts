import { Module } from '@nestjs/common';
import { GuildController } from './guild.controller';
import { GuildService } from './guild.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [GuildController],
  providers: [GuildService],
  exports: [GuildService],
})
export class GuildModule {}
