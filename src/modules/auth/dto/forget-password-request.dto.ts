import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsPhoneNumber, ValidateIf } from "class-validator";
import { VerifyChannel } from "../enums/auth.verify-channel.enum";

export class ForgetPasswordRequestDto {
    @ApiPropertyOptional({ example: 'john.doe@example.com' })
    @ValidateIf(o => !o.phone)
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: '+905321234567' })
    @ValidateIf(o => !o.email)
    @IsPhoneNumber()
    phone?: string;

    @ApiProperty({ enum: VerifyChannel, example: VerifyChannel.EMAIL })
    @IsEnum(VerifyChannel)
    channel: VerifyChannel;
}