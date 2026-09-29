import 'reflect-metadata';

import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { VideoStatusValue } from '../../domain/video-status';

export const VIDEO_STATUS_ENUM_VALUES: VideoStatusValue[] = [
  'PENDING',
  'ANALYZED',
  'PROCESSING',
  'AGGREGATING',
  'COMPLETED',
  'FAILED',
];

@Entity('videos')
export class VideoEntity {
  @PrimaryColumn({ type: 'uuid' })
  public id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  public ownerId!: string;

  @Column({ name: 'original_name', type: 'varchar', length: 512 })
  public originalName!: string;

  @Column({ type: 'varchar', length: 16 })
  public format!: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  public sizeBytes!: string;

  @Column({ name: 'duration_ms', type: 'bigint', nullable: true })
  public durationMs!: string | null;

  @Column({ name: 'storage_key', type: 'varchar', length: 1024 })
  public storageKey!: string;

  @Column({ name: 'zip_key', type: 'varchar', length: 1024, nullable: true })
  public zipKey!: string | null;

  @Column({ type: 'enum', enum: VIDEO_STATUS_ENUM_VALUES, enumName: 'video_status' })
  public status!: VideoStatusValue;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public updatedAt!: Date;
}
