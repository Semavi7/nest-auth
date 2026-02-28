import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { SocialiteType } from "../enums/auth.socialite-type.enum";
import { User } from "./user.entity";

@Entity('socialites')
export class Socialite {
    @PrimaryGeneratedColumn( 'uuid' )
    id: string;

    @Column( { type: 'enum', enum: SocialiteType, default: SocialiteType.FACEBOOK } )
    type: SocialiteType;

    @Column( { type: 'jsonb' } )
    data: any;

    @Column( { type: 'varchar', length: 255 } )
    ref_id: string;

    @Column( { type: 'varchar', length: 255, nullable: true } )
    email: string;

    @Column( { type: 'uuid' } )
    user_id: string;

    @ManyToOne( () => User, user => user.socialites, { onDelete: 'CASCADE' } )
    @JoinColumn( { name: 'user_id' } )
    user: User;
}