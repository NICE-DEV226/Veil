import * as vscode from 'vscode';

export interface UserStats {
    totalFindings: number;
    totalFixed: number;
    streak: {
        current: number;
        longest: number;
    };
    lastUsed: string;
    findingsByRule: { [rule: string]: number };
}

const DEFAULT_STATS: UserStats = {
    totalFindings: 0,
    totalFixed: 0,
    streak: { current: 0, longest: 0 },
    lastUsed: new Date().toISOString().split('T')[0],
    findingsByRule: {}
};

export class StatsManager {
    private static KEY = 'veil.userStats';

    constructor(private context: vscode.ExtensionContext) { }

    public getStats(): UserStats {
        return this.context.globalState.get<UserStats>(StatsManager.KEY) || { ...DEFAULT_STATS };
    }

    public updateStats(newFindingsCount: number, rules: string[]) {
        const stats = this.getStats();
        const today = new Date().toISOString().split('T')[0];

        // Update totals
        stats.totalFindings += newFindingsCount;

        // Update per-rule stats
        for (const rule of rules) {
            stats.findingsByRule[rule] = (stats.findingsByRule[rule] || 0) + 1;
        }

        // Update streak
        if (stats.lastUsed !== today) {
            const lastDate = new Date(stats.lastUsed);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
                stats.streak.current += 1;
            } else {
                stats.streak.current = 1;
            }

            if (stats.streak.current > stats.streak.longest) {
                stats.streak.longest = stats.streak.current;
            }
            stats.lastUsed = today;
        }

        this.context.globalState.update(StatsManager.KEY, stats);
    }

    public incrementFixed() {
        const stats = this.getStats();
        stats.totalFixed += 1;
        this.context.globalState.update(StatsManager.KEY, stats);
    }

    public clearStats() {
        this.context.globalState.update(StatsManager.KEY, DEFAULT_STATS);
    }
}
