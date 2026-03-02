import { Exclude } from "class-transformer";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserStatus } from "../enums/auth.user-status.enum";
import { Socialite } from "./socialites.entity";
import { UserSession } from "./user-sessions.entity";
import { UserAddress } from "./user_addresses.entity";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    first_name: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    last_name: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    phone: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
    email: string | null;

    @Exclude()
    @Column({ type: 'varchar', length: 255, nullable: true })
    password: string | null;

    @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
    status: UserStatus;

    @Column({ type: 'uuid', nullable: true })
    phone_verify_id: string | null;

    @Column({ type: 'uuid', nullable: true })
    email_verify_id: string | null;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deleted_at: Date | null;

    @OneToMany(() => Socialite, socialite => socialite.user)
    socialites: Socialite[];

    @OneToMany(() => UserSession, userSession => userSession.user)
    sessions: UserSession[];

    @OneToMany(() => UserAddress, userAddress => userAddress.user)
    addresses: UserAddress[];

    

}
