// utils/zkWorker.ts
export function createZKWorker() {
  if (typeof window === 'undefined') return null;
  
  // Use native Worker API instead of web-worker package
  return new Worker(new URL('../workers/zk.worker.ts', import.meta.url), {
    type: 'module'
  });
}