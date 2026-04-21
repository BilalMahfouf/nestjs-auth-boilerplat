import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { Entity as DomainEntity } from '../../../common/domain/entity';
import { UserEntity } from './user.entity';

export enum UserSessionTokenType {
    Refresh = 1,
    ResetPassword = 2,
}

@Entity('user_sessions')
@Index('ix_user_sessions_user_id', ['userId'])
@Index('ix_user_sessions_token', ['token'])
export class UserSessionEntity extends DomainEntity {

    @Column({ name: 'user_id', type: 'uuid' })
    userId!: string;

    @Column({ name: 'token', type: 'varchar', length: 1000 })
    token!: string;

    @Column({
        name: 'token_type',
        type: 'smallint',
    })
    tokenType!: UserSessionTokenType;

    @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
    expiresAt!: Date | null;

    @ManyToOne(() => UserEntity, (user) => user.sessions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity;
}
