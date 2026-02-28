import {Controller, Get, Post, Body, Patch, Param, Delete, Req, HttpCode, Res, UseGuards} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { VerifyAccountDto } from './dto/verify-account.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { Request, Response } from 'express';
import { RegisterLoginDto } from './dto/register-login.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgetPasswordRequestDto } from './dto/forget-password-request.dto';
import { ResetPasswordDto } from './dto/reset.password.dto';

@ApiTags('Identity & Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Email veya Telefon ile Kayıt Ol' })
  async register(@Body() dto: any, @Req() req: Request) {
    return this.authService.register(dto, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email veya Telefon ile Giriş Yap' })
  async login(@Req() req: Request, @Body() dto: RegisterLoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(dto);
    const { accessToken, user: userData } = await this.authService.login(user, req.ip, req.headers['user-agent']);
    res.cookie('Authentication', accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 
    });
    return this.handleLoginSuccess(userData, req, res);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google ile Giriş Sayfasına Yönlendir' })
  async googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google Dönüş (Callback) URL' })
  async googleAuthRedirect(@Req() req: Request, @CurrentUser() user, @Res({ passthrough: true }) res: Response) {
    await this.handleLoginSuccess(user, req, res);
    res.redirect('http://localhost:3000/dashboard');
  }

  @Public()
  @Post('forget-password')
  async forgetPassword(@Req() req: Request, @Body() dto: ForgetPasswordRequestDto) {
    return this.authService.forgetPassword(dto, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('verify-account')
  @ApiOperation({ summary: 'Hesabı OTP ile Doğrula (Aktifleştir)' })
  async verifyAccount(@Body() dto: VerifyAccountDto) {
    return this.authService.verifyAccount(dto);
  }

  @Public()
  @Post('resend-verification-otp')
  @ApiOperation({ summary: 'Doğrulama kodunu yeniden gönder' })
  async resendVerificationOtp(@Body() dto: ResendOtpDto, @Req() req: Request) {
    return this.authService.resendVerificationOtp(dto , req.ip, req.headers['user-agent']);
  }

  private async handleLoginSuccess(user: any, req: Request, res: Response) {
    const { accessToken, user: userData } = await this.authService.login(user, req.ip, req.headers['user-agent']);
    res.cookie('Authentication', accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 
    });
    return { message: 'Giriş başarılı', user: userData };
  }

}
