/** «512 Б», «48 КБ», «1,4 МБ». */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} КБ`;
  return `${(kb / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} МБ`;
}
