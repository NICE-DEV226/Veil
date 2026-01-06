import * as vscode from 'vscode';
import { DiagnosticProvider } from '../diagnostics/provider';
import { StatsManager } from '../storage/stats';

export class QuickFixProvider implements vscode.CodeActionProvider {
    constructor(private diagnosticProvider: DiagnosticProvider, private statsManager: StatsManager) { }

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        const findings = this.diagnosticProvider.getFindings(document.uri);

        return findings
            .filter(f => {
                const fRange = new vscode.Range(f.line, f.column, f.endLine, f.endColumn);
                return fRange.intersection(range) !== undefined;
            })
            .filter(f => f.quickFix)
            .map(f => this.createFix(document, f));
    }

    private createFix(document: vscode.TextDocument, finding: any): vscode.CodeAction {
        const fix = new vscode.CodeAction(finding.quickFix.title, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();

        const range = new vscode.Range(
            finding.quickFix.startLine, 0,
            finding.quickFix.endLine, 1000 // Replace whole line
        );

        fix.edit.replace(document.uri, range, finding.quickFix.newCode);

        // Match the exact diagnostic to trigger the lightbulb
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        const target = diagnostics.find(d =>
            d.message === finding.message &&
            d.range.start.line === finding.line
        );

        if (target) {
            fix.diagnostics = [target];
        }

        // Add a command to update stats when the fix is applied
        fix.command = {
            title: 'Update Stats',
            command: 'veil.applyQuickFix',
            arguments: [finding.rule]
        };

        fix.isPreferred = true;
        return fix;
    }
}
