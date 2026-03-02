import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SendSmsOtpEvent } from './events/send-sms-otp.event';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  
  private twilioClient: twilio.Twilio;
  
  constructor(){
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    this.twilioClient = twilio(accountSid, authToken);
  }  

  @OnEvent('sms.send-otp')
  async handleSendSmsOtpEvent(event: SendSmsOtpEvent) {
    console.log(`[Event Yakalandı] ${event.phone} numarasına SMS gönderiliyor...`);

    try {
      const messageBody = `Wibesoft doğrulama kodunuz: ${event.code}. Bu kod 5 dakika geçerlidir.`;

      // Twilio API'sine isteği atıyoruz
      const response = await this.twilioClient.messages.create({
        body: messageBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: event.phone,
      });

      
      console.log(`[SMS Başarılı] Twilio SID: ${response.sid}`);
    } catch (error) {
      console.error(`[SMS Hatası] Twilio ile gönderim başarısız: ${error.message}`);
    }
  }
}
