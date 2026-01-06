import * as vscode from 'vscode';
import { DiagnosticProvider } from '../diagnostics/provider';

export class HoverProvider implements vscode.HoverProvider {
    constructor(private diagnosticProvider: DiagnosticProvider) { }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const findings = this.diagnosticProvider.getFindings(document.uri);
        const finding = findings.find(f => {
            const range = new vscode.Range(f.line, f.column, f.endLine, f.endColumn);
            return range.contains(position);
        });

        if (!finding) {
            return null;
        }

        const content = new vscode.MarkdownString();
        content.appendMarkdown(`### 🛡️ Veil: ${finding.rule}\n\n`);
        content.appendMarkdown(`**Vulnérabilité détectée :** ${finding.message}\n\n`);
        content.appendMarkdown(`**Pourquoi est-ce dangereux ?**\n${finding.explanation}\n\n`);
        content.appendMarkdown(`[En savoir plus](${finding.learnMoreUrl})`);

        return new vscode.Hover(content);
    }
}
