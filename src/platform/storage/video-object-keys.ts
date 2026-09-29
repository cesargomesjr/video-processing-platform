import { posix } from 'node:path';

export function videoObjectRoot(email: string, originalName: string, videoId: string): string {
  const name = posix.basename(originalName.replaceAll('\\', '/'));
  const lastDot = name.lastIndexOf('.');
  const stem = lastDot > 0 ? name.slice(0, lastDot) : name;
  const slug =
    stem
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)
      .replace(/-$/g, '') || 'video';
  const user = encodeURIComponent(email.trim().toLowerCase())
    .replace('%40', '@')
    .replace(/%2B/g, '+');

  return `${user}/Original/${slug}--${videoId}`;
}

export function originalVideoKey(root: string, extension: string): string {
  return `${root}/original${extension}`;
}

export function videoRootFromStorageKey(storageKey: string): string {
  return posix.dirname(storageKey);
}

export function framesPrefix(storageKey: string): string {
  return `${videoRootFromStorageKey(storageKey)}/frames/`;
}

export function archiveKey(storageKey: string): string {
  return `${videoRootFromStorageKey(storageKey)}/archives/frames.zip`;
}
