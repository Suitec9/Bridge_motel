import { buildBabyjub, buildPoseidon } from "circomlibjs";

let babyjub: any = null;
let poseidon: any = null;

async function initialize() {
    if (!babyjub) { 
        babyjub = await buildBabyjub(); 
    }

    if (!poseidon) { 
        poseidon = await buildPoseidon(); 
    }
    
    return { babyjub, poseidon };
}

self.onmessage = async (e: MessageEvent) => {
    const { type, data } = e.data;

    try {
        switch(type) {
            case 'init':
                await initialize();
                self.postMessage({ type: 'init', status: 'success' });
                break;
            
            case 'hash':
                const {babyjub: bj, poseidon: p} = await initialize();
                const hash = p([data.input]); 
                self.postMessage({ type: 'hash', result: hash });
                break;
            
            case 'sign':
                const {babyjub: bjSign, poseidon: pSign} = await initialize();
                const msgHash = pSign([data.message]);
                const signature = bjSign.signPoseidon(data.privateKey, msgHash);
                self.postMessage({ type: 'sign', result: signature });
                break;

            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error: any) {
        self.postMessage({ type: 'error', message: error.message });
    }
}