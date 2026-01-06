import * as vscode from 'vscode';
import * as os from 'os';
import { StatsManager } from '../storage/stats';
import { DiagnosticProvider } from '../diagnostics/provider';

export class SidebarProvider implements vscode.WebviewViewProvider {
    constructor(
        private context: vscode.ExtensionContext,
        private statsManager: StatsManager,
        private diagnosticProvider: DiagnosticProvider
    ) { }

    public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): void {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getHtmlContent(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.type) {
                case 'scanFile':
                    vscode.commands.executeCommand('veil.analyzeActiveFile');
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'Veil');
                    break;
                case 'clearStats':
                    this.statsManager.clearStats();
                    this.diagnosticProvider.reset();
                    // Force a fresh scan of the active file to repopulate current truth
                    if (vscode.window.activeTextEditor) {
                        this.diagnosticProvider.refreshDiagnostics(vscode.window.activeTextEditor.document);
                    }
                    webviewView.webview.postMessage({
                        type: 'updateStats',
                        stats: this.statsManager.getStats()
                    });
                    break;
                case 'openFeedback':
                    vscode.env.openExternal(vscode.Uri.parse('https://nice-dev-veil.vercel.app/#feedback'));
                    break;
                case 'openAdmin':
                    vscode.commands.executeCommand('veil.openAdmin');
                    break;
            }
        });

        // Update stats every time it's opened or periodically
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                webviewView.webview.postMessage({
                    type: 'updateStats',
                    stats: this.statsManager.getStats()
                });
            }
        });
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const stats = this.statsManager.getStats();
        const username = os.userInfo().username || 'Developer';
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'icon.png'));

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                        padding: 16px;
                        background: var(--vscode-sideBar-background);
                        color: var(--vscode-foreground);
                        font-size: 13px;
                        line-height: 1.6;
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding-bottom: 16px;
                        margin-bottom: 20px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .logo {
                        width: 42px;
                        height: 42px;
                        border-radius: 8px;
                        flex-shrink: 0;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    }
                    .header-text { flex: 1; }
                    .title {
                        font-size: 16px;
                        font-weight: 700;
                        letter-spacing: -0.01em;
                        color: var(--vscode-foreground);
                    }
                    .profile-tag {
                        font-size: 11px;
                        color: var(--vscode-textLink-foreground);
                        font-weight: 600;
                        opacity: 0.8;
                        text-transform: uppercase;
                    }
                    .stats-container {
                        display: flex;
                        flex-direction: column;
                        gap: 14px;
                    }
                    .stat-item {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 10px;
                        padding: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        overflow: hidden;
                    }
                    .stat-item:hover {
                        border-color: var(--vscode-focusBorder);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    }
                    .stat-left {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        z-index: 1;
                    }
                    .stat-label {
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                    .stat-value {
                        font-size: 28px;
                        font-weight: 800;
                        color: var(--vscode-foreground);
                        font-variant-numeric: tabular-nums;
                    }
                    .stat-icon {
                        font-size: 24px;
                        opacity: 0.2;
                        position: absolute;
                        right: 12px;
                        bottom: -4px;
                        transform: rotate(-10deg);
                    }
                    .stat-item.error .stat-value { color: var(--vscode-errorForeground); }
                    .stat-item.success .stat-value { color: #89D185; }
                    .stat-item.warning .stat-value { color: #CCA700; }
                    
                    .actions-container {
                        margin-top: 24px;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .action-btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 10px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: opacity 0.2s;
                    }
                    .action-btn:hover { opacity: 0.9; }
                    .action-btn.secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    
                    .info-section {
                        padding: 14px;
                        background: rgba(255,255,255,0.03);
                        border-radius: 8px;
                        margin-top: 24px;
                        border: 1px dashed var(--vscode-panel-border);
                    }
                    .info-title {
                        font-size: 12px;
                        font-weight: 600;
                        margin-bottom: 6px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .info-text {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        line-height: 1.5;
                    }
                    .footer {
                        margin-top: 32px;
                        text-align: center;
                        font-size: 11px;
                        opacity: 0.5;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${logoUri}" alt="Veil" class="logo">
                    <div class="header-text">
                        <div class="profile-tag">Agent: ${username}</div>
                        <div class="title">Veil Security</div>
                    </div>
                </div>
                
                <div class="stats-container">
                    <div class="stat-item error">
                        <div class="stat-left">
                            <div class="stat-label">Risks Blocked</div>
                            <div id="stat-findings" class="stat-value">${stats.totalFindings}</div>
                        </div>
                        <div class="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                    </div>
                    
                    <div class="stat-item success">
                        <div class="stat-left">
                            <div class="stat-label">Fixed Automatically</div>
                            <div id="stat-fixed" class="stat-value">${stats.totalFixed}</div>
                        </div>
                        <div class="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813-6.119.444 4.1.4.2 4.544 6.119 5.813 1.912-5.813 6.119-.444-4.1-.4-.2-4.544-6.119-5.813Z"/></svg>
                        </div>
                    </div>
                </div>

                <div class="actions-container">
                    <button class="action-btn" id="scan-btn" title="Immediately re-analyze the currently open file.">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        Scan File
                    </button>
                    <p style="font-size: 10px; opacity: 0.5; margin-bottom: 5px;">Force instant AST analysis of the active document.</p>
                    
                    <button class="action-btn secondary" id="settings-btn" title="Modify which security rules are active.">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        Settings
                    </button>
                    <p style="font-size: 10px; opacity: 0.5; margin-bottom: 5px;">Configure detection thresholds and toggle rules.</p>
                    
                    <button class="action-btn secondary" id="clear-btn" style="color: var(--vscode-errorForeground);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        Reset Stats
                    </button>

                    <button class="action-btn secondary" id="feedback-btn" style="border: 1px dashed var(--vscode-panel-border); background: transparent;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Suggest a Fix
                    </button>
                    <p style="font-size: 10px; opacity: 0.5; margin-bottom: 5px;">Share feature ideas or new security rules.</p>
                </div>
                
                <div class="info-section">
                    <div class="info-title"><span>🔒</span> 100% Private</div>
                    <div class="info-text">Analysis is performed entirely on your machine. No code ever leaves this session.</div>
                </div>
                
                <div class="footer">
                    Veil Engine v1.0.0 • <a href="https://github.com/NICE-DEV226" style="color: inherit; text-decoration: none; font-weight: 600;">NICE-DEV</a>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('scan-btn').addEventListener('click', () => {
                        vscode.postMessage({ type: 'scanFile' });
                    });
                    
                    document.getElementById('settings-btn').addEventListener('click', () => {
                        vscode.postMessage({ type: 'openSettings' });
                    });
                    
                    document.getElementById('clear-btn').addEventListener('click', () => {
                        vscode.postMessage({ type: 'clearStats' });
                    });

                    document.getElementById('feedback-btn').addEventListener('click', () => {
                        vscode.postMessage({ type: 'openFeedback' });
                    });

                    document.getElementById('admin-btn').addEventListener('click', () => {
                        vscode.postMessage({ type: 'openAdmin' });
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'updateStats') {
                            document.getElementById('stat-findings').textContent = message.stats.totalFindings;
                            document.getElementById('stat-fixed').textContent = message.stats.totalFixed;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
