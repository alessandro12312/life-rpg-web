import { IsString, IsOptional, IsEnum } from 'class-validator';

export class SubmitActionDto {
    @IsEnum(['ATTACK', 'SKILL', 'DEFEND', 'ITEM'], { message: 'action deve essere ATTACK, SKILL, DEFEND o ITEM' })
    action: string;

    @IsOptional()
    @IsString()
    skill_id?: string;

    @IsOptional()
    @IsString()
    item_id?: string;
}
