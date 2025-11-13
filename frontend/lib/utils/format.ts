/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number | string | undefined | null): string {
  if (!bytes || bytes === 0) return '0 B';
  
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(numBytes)) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  
  return `${parseFloat((numBytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

