import * as vscode from 'vscode';
import { EngineProcess } from './engine/process';
import { EngineClient } from './engine/client';
import { DiagnosticProvider } from './diagnostics/provider';
import { HoverProvider } from './actions/hover';
import { QuickFixProvider } from './actions/quick-fix';
import { StatsManager } from './storage/stats';
import { SidebarProvider } from './ui/sidebar';
import { DashboardProvider } from './ui/dashboard';
import { TelemetryService } from './engine/telemetry';

let engineProcess: EngineProcess;

export function activate(context: vscode.ExtensionContext) {
    engineProcess = new EngineProcess(context.extensionPath);
    engineProcess.start();

    const statsManager = new StatsManager(context);
    const engineClient = new EngineClient(engineProcess);
    const diagnosticProvider = new DiagnosticProvider(engineClient, statsManager);

    const hoverProvider = new HoverProvider(diagnosticProvider);
    const quickFixProvider = new QuickFixProvider(diagnosticProvider, statsManager);
    const sidebarProvider = new SidebarProvider(context, statsManager, diagnosticProvider);

    const telemetryService = new TelemetryService(context, statsManager);
    telemetryService.start();

    // Initial check for active editor
    if (vscode.window.activeTextEditor) {
        diagnosticProvider.refreshDiagnostics(vscode.window.activeTextEditor.document);
    }

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('veil.analyzeActiveFile', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                diagnosticProvider.refreshDiagnostics(editor.document);
                vscode.window.showInformationMessage('Veil: Analysis complete 🛡️');
            }
        }),
        vscode.commands.registerCommand('veil.applyQuickFix', (rule: string) => {
            statsManager.incrementFixed();
            vscode.window.setStatusBarMessage(`Veil: Applied fix for ${rule}`, 3000);
        }),
        vscode.commands.registerCommand('veil.openAdmin', () => {
            DashboardProvider.createOrShow(context.extensionUri, statsManager);
        })
    );

    // Subscribe to events
    let debounceTimer: NodeJS.Timeout | undefined;
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('veil-sidebar', sidebarProvider),
        vscode.languages.registerHoverProvider({ scheme: 'file' }, hoverProvider),
        vscode.languages.registerCodeActionsProvider({ scheme: 'file' }, quickFixProvider, {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
        }),
        vscode.workspace.onDidChangeTextDocument(e => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                diagnosticProvider.refreshDiagnostics(e.document);
            }, 500); // 500ms debounce per cahier des charges
        }),
        vscode.workspace.onDidOpenTextDocument(doc => {
            diagnosticProvider.refreshDiagnostics(doc);
        }),
        vscode.workspace.onDidCloseTextDocument(doc => {
            diagnosticProvider.clearDiagnostics(doc);
        })
    );
}

export function deactivate() {
    if (engineProcess) {
        engineProcess.stop();
    }
}
