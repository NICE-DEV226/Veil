export interface QuickFix {
    title: string;
    newCode: string;
    startLine: number;
    endLine: number;
}

export interface Finding {
    rule: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    explanation: string;
    learnMoreUrl: string;
    quickFix?: QuickFix;
}

export interface AnalysisRequest {
    code: string;
    language: string;
    filepath: string;
}

export interface AnalysisResponse {
    findings: Finding[];
}
