import { EngineProcess } from './process';
import { AnalysisRequest, AnalysisResponse } from '../types';
import * as readline from 'readline';

export class EngineClient {
    private requestId = 0;
    private callbacks = new Map<number, (res: any) => void>();

    constructor(private engineProcess: EngineProcess) {
        const rl = readline.createInterface({
            input: this.engineProcess.stdout!,
            terminal: false
        });

        rl.on('line', (line) => {
            try {
                const response = JSON.parse(line);
                if (response.id !== undefined && this.callbacks.has(response.id)) {
                    const callback = this.callbacks.get(response.id)!;
                    this.callbacks.delete(response.id);
                    callback(response.result);
                }
            } catch (e) {
                console.error('Failed to parse engine response', e);
            }
        });
    }

    public async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
        const id = this.requestId++;
        const payload = {
            jsonrpc: '2.0',
            method: 'analyze',
            params: request,
            id: id
        };

        return new Promise((resolve) => {
            this.callbacks.set(id, resolve);
            this.engineProcess.stdin!.write(JSON.stringify(payload) + '\n');
        });
    }
}
