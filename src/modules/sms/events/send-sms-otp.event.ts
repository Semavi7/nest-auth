export class SendSmsOtpEvent {
  constructor(
    public readonly phone: string,
    public readonly code: string,
  ) {}
}