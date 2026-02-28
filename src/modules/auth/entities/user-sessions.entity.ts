import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { DeviceType } from "../enums/auth.device-type.enum";
import { User } from "./user.entity";

@Entity('user_sessions')
export class UserSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column( { type: 'uuid' } )
    user_id: string;

    @Column( { type: 'varchar', length: 255, nullable: true } )
    refresh_token_Hash: string;

    @Column( { type: 'varchar', length: 255 } )
    device_id: string;

    @Column( { type: 'enum', enum: DeviceType} )
    device_type: DeviceType;

    @Column( { type: 'varchar', length: 255 } )
    divace_name: string;

    @Column( { type: 'varchar', length: 255 } )
    ip_address: string;

    @Column( { type:'text' } )
    user_agent: string;

    @Column( { type: 'timestamp' } )
    last_active_at: Date;

    @Column( { type: 'timestamp' } )
    expires_at: Date;

    @Column( { type: 'timestamp' } )
    revoked_at: Date;

    @CreateDateColumn( { type: 'timestamp' } )
    created_at: Date;

    @ManyToOne( () => User, user => user.sessions, { onDelete: 'CASCADE' } )
    @JoinColumn( { name: 'user_id' } )
    user: User;
}