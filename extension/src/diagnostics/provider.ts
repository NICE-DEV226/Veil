import * as vscode from 'vscode';
import { EngineClient } from '../engine/client';
import { Finding } from '../types';
import { StatsManager } from '../storage/stats';

export class DiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private findingsMap: Map<string, Finding[]> = new Map();
    private activeAnalyses: Set<string> = new Set();

    constructor(private engineClient: EngineClient, private statsManager: StatsManager) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('veil');
    }

    public async refreshDiagnostics(document: vscode.TextDocument) {
        if (!['python', 'javascript', 'typescript', 'typescriptreact'].includes(document.languageId)) {
            return;
        }

        const uriStr = document.uri.toString();
        if (this.activeAnalyses.has(uriStr)) {
            return;
        }

        this.activeAnalyses.add(uriStr);

        try {
            const response = await this.engineClient.analyze({
                code: document.getText(),
                language: document.languageId === 'typescriptreact' ? 'typescript' : document.languageId,
                filepath: document.fileName
            });

            const currentFindings = response.findings;
            const oldFileFindings = this.findingsMap.get(uriStr) || [];

            const countByRule = (findings: Finding[]) => {
                const counts: { [rule: string]: number } = {};
                findings.forEach(f => counts[f.rule] = (counts[f.rule] || 0) + 1);
                return counts;
            };

            const currentCounts = countByRule(currentFindings);
            const oldCounts = countByRule(oldFileFindings);

            let trulyNewCount = 0;
            const newRules: string[] = [];

            for (const [rule, count] of Object.entries(currentCounts)) {
                const oldCount = oldCounts[rule] || 0;
                if (count > oldCount) {
                    const diff = count - oldCount;
                    trulyNewCount += diff;
                    for (let i = 0; i < diff; i++) newRules.push(rule);
                }
            }

            this.findingsMap.set(uriStr, currentFindings);

            if (trulyNewCount > 0) {
                this.statsManager.updateStats(trulyNewCount, newRules);
            }

            const diagnostics: vscode.Diagnostic[] = currentFindings.map((finding: Finding) => {
                const range = new vscode.Range(
                    finding.line, finding.column,
                    finding.endLine, finding.endColumn
                );

                const severity = finding.severity === 'error' ? vscode.DiagnosticSeverity.Error :
                    finding.severity === 'warning' ? vscode.DiagnosticSeverity.Warning :
                        vscode.DiagnosticSeverity.Information;

                const diagnostic = new vscode.Diagnostic(range, finding.message, severity);
                diagnostic.source = 'Veil';
                diagnostic.code = finding.rule;

                return diagnostic;
            });

            this.diagnosticCollection.set(document.uri, diagnostics);

        } finally {
            this.activeAnalyses.delete(uriStr);
        }
    }

    public getFindings(uri: vscode.Uri): Finding[] {
        return this.findingsMap.get(uri.toString()) || [];
    }

    public clearDiagnostics(document: vscode.TextDocument) {
        this.diagnosticCollection.delete(document.uri);
    }

    public reset() {
        this.findingsMap.clear();
        this.activeAnalyses.clear();
        this.diagnosticCollection.clear();
    }
}
