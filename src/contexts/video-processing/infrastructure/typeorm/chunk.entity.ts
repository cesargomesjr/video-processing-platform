import 'reflect-metadata';

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { ChunkStatusValue } from '../../domain/chunk-status';

export const CHUNK_STATUS_ENUM_VALUES: ChunkStatusValue[] = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
];

@Entity('video_chunks')
@Unique(['videoId', 'chunkIndex'])
export class ChunkEntity {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column({ name: 'video_id', type: 'uuid' })
  public videoId!: string;

  @Column({ name: 'chunk_index', type: 'int' })
  public chunkIndex!: number;

  @Column({ name: 'start_ms', type: 'bigint', default: 0 })
  public startMs!: string;

  @Column({ name: 'duration_ms', type: 'bigint', default: 0 })
  public durationMs!: string;

  @Column({ type: 'enum', enum: CHUNK_STATUS_ENUM_VALUES, enumName: 'chunk_status' })
  public status!: ChunkStatusValue;

  @Column({ type: 'int', default: 0 })
  public attempts!: number;

  @Column({ name: 'worker_id', type: 'varchar', length: 128, nullable: true })
  public workerId!: string | null;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  public lockedUntil!: Date | null;

  @Column({ name: 'frame_count', type: 'int', nullable: true })
  public frameCount!: number | null;

  @Column({ name: 'error_reason', type: 'varchar', length: 512, nullable: true })
  public errorReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public updatedAt!: Date;
}
