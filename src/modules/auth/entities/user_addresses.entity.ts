import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AddressType } from "../enums/auth.address-type.enum";
import { User } from "./user.entity";

@Entity('user_addresses')
export class UserAddress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column( { type: 'uuid' } )
    user_id: string;

    @Column( { type: 'varchar', length: 255 } )
    title: string;

    @Column( { type: 'enum', enum: AddressType } )
    type: AddressType;

    @Column( { type: 'boolean', default: false } )
    is_default: boolean;

    @Column( { type: 'varchar', length: 255 } )
    full_name: string;

    @Column( { type: 'varchar', length: 255 } )
    phone: string;

    @Column( { type: 'uuid' } )
    city_id: string;

    @Column( { type: 'uuid' } )
    neighborhood_id: string;

    @Column( { type: 'text' } )
    address_line: string;

    @Column( { type: 'varchar', length: 255, nullable: true } )
    zip_code: string;

    @Column( { type: 'boolean', default: false } )
    is_corporate: boolean;

    @Column( { type: 'varchar', length: 255, nullable: true } )
    company_name: string;

    @Column( { type: 'varchar', length: 255, nullable: true } )
    tax_number: string;

    @Column( { type: 'varchar', length: 255, nullable: true } )
    tax_office: string;

    @CreateDateColumn( { type: 'timestamp' } )
    created_at: Date;

    @UpdateDateColumn( { type: 'timestamp' } )
    updated_at: Date;

    @DeleteDateColumn( { type: 'timestamp', nullable: true } )
    deleted_at: Date;

    @ManyToOne( () => User, user => user.addresses, { onDelete: 'CASCADE' } )
    @JoinColumn( { name: 'user_id' } )
    user: User;
}