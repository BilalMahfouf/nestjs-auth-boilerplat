import { randomUUID } from 'node:crypto';

export interface IDomainEvent {
    id: string;
}

export abstract class DomainEvent implements IDomainEvent {
    id: string = randomUUID();
}