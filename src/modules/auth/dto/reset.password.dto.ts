import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class ResetPasswordDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    verify_id: string;

    @ApiProperty()
    @IsString()
    @Length(6, 6)
    code: string;

    @ApiProperty()
    @IsString()
    @Length(6)
    new_password: string;
}