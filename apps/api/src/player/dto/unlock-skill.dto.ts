import { IsString, IsNotEmpty } from 'class-validator';

export class UnlockSkillDto {
    @IsString()
    @IsNotEmpty()
    skillId: string;
}
