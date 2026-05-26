import { Module } from '@nestjs/common';
import { SanctumService } from './sanctum.service';
import { SanctumController } from './sanctum.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [SanctumService],
  controllers: [SanctumController],
})
export class SanctumModule {}
