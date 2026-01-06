import * as vscode from 'vscode';
import axios from 'axios';
import { StatsManager } from '../storage/stats';
import { v4 as uuidv4 } from 'uuid';

export class TelemetryService {
    private static INTERVAL = 60000; // 1 minute heartbeat
    private userId: string;

    constructor(private context: vscode.ExtensionContext, private statsManager: StatsManager) {
        // Get or Create Persistent User ID
        this.userId = this.context.globalState.get<string>('veil.userId') || '';
        if (!this.userId) {
            this.userId = uuidv4();
            this.context.globalState.update('veil.userId', this.userId);
        }
    }

    public start() {
        console.log(`[Telemetry] Starting for User: ${this.userId}`);
        setInterval(() => this.report(), TelemetryService.INTERVAL);
        // Immediate report on start
        this.report();
    }

    private async report() {
        try {
            const stats = this.statsManager.getStats();
            await axios.post('http://localhost:8080/api/telemetry', {
                userId: this.userId,
                totalFindings: stats.totalFindings,
                totalFixed: stats.totalFixed,
                findingsByRule: stats.findingsByRule
            });
            console.log(`[Telemetry] Stats pushed for ${this.userId}`);
        } catch (error) {
            console.error('[Telemetry] Failed to reach central API. Running in local-only mode.');
        }
    }
}
