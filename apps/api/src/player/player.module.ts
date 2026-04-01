import { Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerController } from './player.controller';
import { GuildModule } from '../guild/guild.module';

@Module({
  imports: [GuildModule],
  providers: [PlayerService],
  controllers: [PlayerController]
})
export class PlayerModule {}
