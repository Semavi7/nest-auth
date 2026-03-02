import {Controller, Get, Post, Body, Req, HttpCode, HttpStatus, Res, UseGuards, UnauthorizedException} from '@nestjs/common';
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
import { plainToInstance } from 'class-transformer';
import { RegisterLoginResponseDto } from './dto/register-login-response.dto';

@ApiTags('Identity & Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Email veya Telefon ile Kayıt Ol' })
  async register(@Body() dto: RegisterLoginDto, @Req() req: Request) {
    const { message, user: userData } = await this.authService.register(dto, req.ip, req.headers['user-agent']);
    return { 
      message, 
      user: plainToInstance(RegisterLoginResponseDto, userData, { excludeExtraneousValues: true }) 
    };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email veya Telefon ile Giriş Yap' })
  async login(@Req() req: Request, @Body() dto: RegisterLoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(dto);
    return this.handleLoginSuccess(user, req, res, {
      device_type: dto.device_type,
      device_name: dto.device_name,
      device_id: dto.device_id,
    });
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
  @ApiOperation({ summary: 'Şifre Sıfırlama Talebi Oluştur' })
  async forgetPassword(@Req() req: Request, @Body() dto: ForgetPasswordRequestDto) {
    return this.authService.forgetPassword(dto, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Yeni Şifre Belirle' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access Token Yenile' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as any).cookies?.RefreshToken;
    if (!token) throw new UnauthorizedException('Refresh token bulunamadı.');
    const { accessToken, refreshToken } = await this.authService.refreshToken(token);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { message: 'Token yenilendi.' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Çıkış Yap' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout((req as any).user.sessionId);
    res.clearCookie('Authentication');
    res.clearCookie('RefreshToken');
    return result;
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Aktif Oturumları Listele' })
  async sessions(@Req() req: Request) {
    return this.authService.getActiveSessions((req as any).user.userId);
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

  private async handleLoginSuccess(user: any, req: Request, res: Response, deviceInfo?: { device_type?: any; device_name?: string; device_id?: string }) {
    const { accessToken, refreshToken, user: userData } = await this.authService.login(user, req.ip, req.headers['user-agent'], deviceInfo);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { 
      message: 'Giriş başarılı',
      user: plainToInstance(RegisterLoginResponseDto, userData, { excludeExtraneousValues: true }) 
    };
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('Authentication', accessToken, {
      httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 15 * 60 * 1000,
    });
    res.cookie('RefreshToken', refreshToken, {
      httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

}
