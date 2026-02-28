import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsPhoneNumber, IsString, Length, ValidateIf } from "class-validator";

export class VerifyAccountDto {
    @ApiPropertyOptional()
    @ValidateIf(o => !o.phone)
    @IsEmail()
    email?: string;

    @ApiPropertyOptional()
    @ValidateIf(o => !o.email)
    @IsPhoneNumber()
    phone?: string;

    @ApiProperty()
    @IsString()
    @Length(6, 6, { message: 'Doğrulama kodu 6 haneli olmalıdır.' })
    code: string;
}