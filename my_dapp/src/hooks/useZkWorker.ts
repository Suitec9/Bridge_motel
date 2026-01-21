import { useEffect, useRef, useState } from "react";

interface ZkWorkerMessage {
    type: string;
    result?: any;
    success?: boolean;
    error?: string;
}

export function useZkWorker() {
    const workerRef = useRef<Worker | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pendingCallbacks = useRef<Map<string, (result: any) => void>>(new Map());

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            // Create worker using native API
            const worker = new Worker(
                new URL('../workers/zk.worker.ts', import.meta.url),
                { type: 'module'}
            );

            worker.onmessage = (e: MessageEvent<ZkWorkerMessage>) => {
                const { type, result, success, error: workerError} = e.data;

                if (type === 'init' && success) {
                    setIsReady(true);
                } else if (type === 'error') {
                    setError(workerError || 'Unknown error');
                } else {
                    // Handle callback
                    const callback = pendingCallbacks.current.get(type);
                    if (callback) {
                        callback(result);
                        pendingCallbacks.current.delete(type);
                    }
                }
            };

            worker.onerror = (err) => {
                console.error('Worker error:', err);
                setError(err.message);
            };

            workerRef.current = worker;

            // Initialize worker
            worker.postMessage({ type: 'init'});

            return () => {
                worker.terminate();
                workerRef.current = null;
            };
        } catch (err: any) {
            setError(err.message);
        }
    }, []);

    const callWorker = <T,>(type: string, data?: any): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
            if (!workerRef.current) {
                return reject(new Error('Worker is not initialized'));
            }
 
            // Store callback
            pendingCallbacks.current.set(type, resolve);
            
            try {
                workerRef.current.postMessage({ type, data });
            } catch (err: any) {
                pendingCallbacks.current.delete(type);
                reject(err);
            }

            // Timeout after 30 seconds
            setTimeout(() => {
                if (pendingCallbacks.current.has(type)) {
                    pendingCallbacks.current.delete(type);
                    reject(new Error('Worker call timed out'));
                }
            }, 30000);
        });
    };

    return { isReady, error, callWorker };
}