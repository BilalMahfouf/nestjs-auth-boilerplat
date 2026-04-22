import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';
import { IDomainEvent } from './domain-event';

export abstract class Entity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @CreateDateColumn({ name: 'created_on_utc', type: 'timestamptz' })
  createdOnUtc!: Date;

  private readonly _domainEvents: IDomainEvent[] = [];

  public get domainEvents(): ReadonlyArray<IDomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: IDomainEvent): void {
    this._domainEvents.push(event);
  }
}
