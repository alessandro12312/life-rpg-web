import { Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerController } from './player.controller';
import { GuildModule } from '../guild/guild.module';
import { BattleModule } from '../battle/battle.module';

@Module({
  imports: [GuildModule, BattleModule],
  providers: [PlayerService],
  controllers: [PlayerController],
})
export class PlayerModule {}
