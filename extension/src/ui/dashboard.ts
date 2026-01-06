import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { StatsManager } from '../storage/stats';

export class DashboardProvider {
    public static readonly viewType = 'veil.adminDashboard';
    private static currentPanel: DashboardProvider | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, statsManager: StatsManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DashboardProvider.currentPanel) {
            DashboardProvider.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            DashboardProvider.viewType,
            'Veil | Admin Command Center',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(extensionUri.fsPath, 'website'))],
                retainContextWhenHidden: true
            }
        );

        DashboardProvider.currentPanel = new DashboardProvider(panel, extensionUri, statsManager);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, private statsManager: StatsManager) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'requestStats':
                        this._panel.webview.postMessage({ type: 'updateStats', stats: this.statsManager.getStats() });
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        DashboardProvider.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const websitePath = path.join(this._extensionUri.fsPath, 'website');
        let html = fs.readFileSync(path.join(websitePath, 'admin.html'), 'utf8');

        // Replace relative paths with webview URIs
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(websitePath, 'script.js')));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(websitePath, 'styles.css')));
        const logoUri = webview.asWebviewUri(vscode.Uri.file(path.join(websitePath, 'logo1.png')));

        html = html.replace('script.js', scriptUri.toString());
        html = html.replace('styles.css', styleUri.toString());
        html = html.replace('logo1.png', logoUri.toString());

        // Add VS Code API bridge
        const bridgeScript = `
            <script>
                const vscode = acquireVsCodeApi();
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'updateStats') {
                        window.veilStats = message.stats;
                        if (typeof renderDashboardStats === 'function') renderDashboardStats();
                        if (typeof initializeCharts === 'function') initializeCharts();
                    }
                });
                setInterval(() => {
                    vscode.postMessage({ type: 'requestStats' });
                }, 5000);
                vscode.postMessage({ type: 'requestStats' });
            </script>
        `;

        html = html.replace('</body>', `${bridgeScript}</body>`);

        return html;
    }
}
