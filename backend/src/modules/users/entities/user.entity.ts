import {
    Column,
    Entity,
    Index,
    OneToMany,
} from 'typeorm';
import { Entity as DomainEntity } from '../../../common/domain/entity';
import { UserSessionEntity } from './user-session.entity';

export enum UserRole {
    Admin = 'Admin',
    Doctor = 'Doctor',
}

@Entity('users')
@Index('ix_users_email', ['email'], { unique: true })
@Index('ix_users_user_name', ['userName'], { unique: true })
export class UserEntity extends DomainEntity {

    @Column({ name: 'user_name', type: 'varchar', length: 100 })
    userName!: string;

    @Column({ name: 'email', type: 'varchar', length: 256 })
    email!: string;

    @Column({ name: 'password_hash', type: 'varchar', length: 500 })
    passwordHash!: string;

    @Column({ name: 'role', type: 'varchar', length: 50, default: UserRole.Doctor })
    role!: UserRole;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive!: boolean;

    @OneToMany(() => UserSessionEntity, (session) => session.user)
    sessions!: UserSessionEntity[];

    updatePassword(newPassword: string, newPasswordHash: string): void {
        if (newPassword.length < 6) {
            throw new Error('User.InvalidPasswordLength');
        }

        this.passwordHash = newPasswordHash;
    }

    updateProfile(userName: string): void {
        this.userName = userName;
    }

    updateEmail(email: string): void {
        this.email = email;
    }
}
