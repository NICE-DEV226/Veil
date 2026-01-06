import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

export class EngineProcess {
    private process: cp.ChildProcess | null = null;

    constructor(private extensionPath: string) { }

    public start(): cp.ChildProcess {
        const binName = process.platform === 'win32' ? 'veil.exe' : 'veil';
        const binPath = path.join(this.extensionPath, 'bin', binName);

        this.process = cp.spawn(binPath, [], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stderr?.on('data', (data) => {
            console.error(`Engine STDERR: ${data}`);
        });

        this.process.on('error', (err) => {
            console.error(`Failed to spawn engine process: ${err.message}`);
        });

        this.process.on('close', (code) => {
            console.log(`Engine process exited with code ${code}`);
            this.process = null;
        });

        return this.process;
    }

    public stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }

    public get isRunning(): boolean {
        return this.process !== null;
    }

    public get stdin() {
        return this.process?.stdin;
    }

    public get stdout() {
        return this.process?.stdout;
    }
}
