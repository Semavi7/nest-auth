import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsPhoneNumber, IsString, Length, ValidateIf } from "class-validator";

export class VerifyAccountDto {
    @ApiPropertyOptional({ example: 'john.doe@example.com' })
    @ValidateIf(o => !o.phone)
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: '+905321234567' })
    @ValidateIf(o => !o.email)
    @IsPhoneNumber()
    phone?: string;

    @ApiProperty({ example: '482931' })
    @IsString()
    @Length(6, 6, { message: 'Doğrulama kodu 6 haneli olmalıdır.' })
    code: string;
}