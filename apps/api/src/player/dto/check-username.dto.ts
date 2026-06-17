import { IsString, Matches } from 'class-validator';

export class CheckUsernameDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,20}$/, {
    message: 'Username deve contenere 3-20 caratteri alfanumerici o underscore',
  })
  username: string;
}
