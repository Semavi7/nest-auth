import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('forget_password')
export class ForgetPassword {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column( { type: 'uuid' } )
    user_id: string;

    @Column( { type: 'timestamp' } )
    expires_at: Date;

    @Column( { type: 'uuid' } )
    verify_id: string;

    @Column( { type: 'timestamp', nullable: true } )
    is_used_at: Date | null;
}