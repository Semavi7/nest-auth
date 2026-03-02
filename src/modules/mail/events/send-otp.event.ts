export class SendOtpEvent {
    constructor(
        public readonly email: string,
        public readonly code: string
    ){}
}