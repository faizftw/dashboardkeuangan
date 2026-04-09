/**
 * Chunks an array into smaller arrays of a given size.
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  if (!array || array.length === 0) return chunks
  
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  
  return chunks
}
