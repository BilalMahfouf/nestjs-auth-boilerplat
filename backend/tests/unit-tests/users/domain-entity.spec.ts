import { DomainEvent } from '../../../src/common/domain/domain-event';
import { Entity as DomainEntity } from '../../../src/common/domain/entity';
import {
    UserEntity,
    UserRole,
} from '../../../src/modules/users/entities/user.entity';
import {
    UserSessionEntity,
    UserSessionTokenType,
} from '../../../src/modules/users/entities/user-session.entity';

class TestDomainEvent extends DomainEvent { }

class TestEntity extends DomainEntity {
    public raise(event: TestDomainEvent): void {
        this.addDomainEvent(event);
    }
}

describe('Domain base abstractions', () => {
    it('creates unique ids for domain events', () => {
        const first = new TestDomainEvent();
        const second = new TestDomainEvent();

        expect(first.id).toEqual(expect.any(String));
        expect(second.id).toEqual(expect.any(String));
        expect(first.id).not.toBe(second.id);
    });

    it('adds and exposes domain events through base entity', () => {
        const entity = new TestEntity();
        const event = new TestDomainEvent();

        entity.raise(event);

        expect(entity.domainEvents).toHaveLength(1);
        expect(entity.domainEvents[0]).toBe(event);
    });
});

describe('User entities', () => {
    it('updates password hash when password is valid', () => {
        const user = new UserEntity();
        user.passwordHash = 'old-hash';

        user.updatePassword('new-password', 'new-hash');

        expect(user.passwordHash).toBe('new-hash');
    });

    it('throws when password length is below minimum', () => {
        const user = new UserEntity();

        expect(() => user.updatePassword('12345', 'ignored-hash')).toThrow(
            'User.InvalidPasswordLength',
        );
    });

    it('updates profile and email fields', () => {
        const user = new UserEntity();

        user.updateProfile('doctor-updated');
        user.updateEmail('doctor-updated@example.com');

        expect(user.userName).toBe('doctor-updated');
        expect(user.email).toBe('doctor-updated@example.com');
    });

    it('keeps expected enum values for user role and session token type', () => {
        expect(UserRole.Doctor).toBe('Doctor');
        expect(UserRole.Admin).toBe('Admin');
        expect(UserSessionTokenType.Refresh).toBe(1);
        expect(UserSessionTokenType.ResetPassword).toBe(2);
    });

    it('supports assigning user relation on user session entity', () => {
        const user = new UserEntity();
        const session = new UserSessionEntity();

        session.user = user;

        expect(session.user).toBe(user);
    });
});