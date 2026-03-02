import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class ResetPasswordDto {
    @ApiProperty({ example: 'a3f2c1d4-5e6b-7890-abcd-ef1234567890' })
    @IsString()
    @IsNotEmpty()
    verify_id: string;

    @ApiProperty({ example: '482931' })
    @IsString()
    @Length(6, 6)
    code: string;

    @ApiProperty({ example: 'NewSecret@123' })
    @IsString()
    @Length(6)
    new_password: string;
}