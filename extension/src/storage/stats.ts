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
    history: {
        hourly: { [hour: string]: number }; // Format: YYYY-MM-DD-HH
        daily: { [date: string]: number };  // Format: YYYY-MM-DD
    };
}

const DEFAULT_STATS: UserStats = {
    totalFindings: 0,
    totalFixed: 0,
    streak: { current: 0, longest: 0 },
    lastUsed: new Date().toISOString().split('T')[0],
    findingsByRule: {},
    history: {
        hourly: {},
        daily: {}
    }
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

        for (const rule of rules) {
            stats.findingsByRule[rule] = (stats.findingsByRule[rule] || 0) + 1;
        }

        // Update history
        const now = new Date();
        const hourKey = `${today}-${now.getHours()}`;
        stats.history.hourly[hourKey] = (stats.history.hourly[hourKey] || 0) + newFindingsCount;
        stats.history.daily[today] = (stats.history.daily[today] || 0) + newFindingsCount;

        // Cleanup old history (keep 7 days of daily, 24h of hourly)
        this.cleanupHistory(stats);

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

    private cleanupHistory(stats: UserStats) {
        // Simple cleanup: only keep last 100 entries to prevent globalState bloat
        const hourKeys = Object.keys(stats.history.hourly).sort();
        if (hourKeys.length > 48) {
            hourKeys.slice(0, hourKeys.length - 48).forEach(k => delete stats.history.hourly[k]);
        }

        const dailyKeys = Object.keys(stats.history.daily).sort();
        if (dailyKeys.length > 30) {
            dailyKeys.slice(0, dailyKeys.length - 30).forEach(k => delete stats.history.daily[k]);
        }
    }
}
