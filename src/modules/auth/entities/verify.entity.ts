import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { VerifyChannel } from "../enums/auth.verify-channel.enum";
import { VerifyStatus } from "../enums/auth.verify-status.enum";
import { VerifyType } from "../enums/auth.verify-type.enum";

@Entity('verify')
export class Verify {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column( { type: 'enum', enum: VerifyChannel} )
    channel: VerifyChannel;

    @Column( { type: 'timestamp' } )
    expires_at: Date;

    @Column( { type: 'enum', enum: VerifyStatus, default: VerifyStatus.PENDING } )
    status: VerifyStatus;

    @Column( { type: 'uuid' } )
    user_id: string;

    @Column( { type: 'varchar', length: 255 } )
    code: string;

    @Column( { type: 'smallint' , default: 0 } )
    attempts_count: number;

    @Column( { type: 'varchar', length: 255 } )
    ip_address: string;

    @Column( { type:'varchar', length: 255 } )
    user_agent: string;

    @Column( { type: 'enum', enum: VerifyType } )
    type: VerifyType;
}