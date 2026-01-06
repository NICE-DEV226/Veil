package analyzer

import (
	"github.com/NICE-DEV226/Veil/engine/pkg/rules"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

func Analyze(req types.AnalysisRequest) (types.AnalysisResponse, error) {
	var allFindings []types.Finding

	// Rule 1: Hardcoded Secrets (All languages)
	allFindings = append(allFindings, rules.AnalyzeSecrets(req.Code, req.FilePath, req.Language)...)

	// Rule 2: SQL Injection (Relevant for backend languages)
	allFindings = append(allFindings, rules.AnalyzeSQLInjection(req.Code, req.FilePath, req.Language)...)

	// Rule 3: XSS (Relevant for frontend/web languages)
	if req.Language == "javascript" || req.Language == "typescript" {
		allFindings = append(allFindings, rules.AnalyzeXSS(req.Code, req.FilePath, req.Language)...)
	}

	// Rule 4: Command Injection
	allFindings = append(allFindings, rules.AnalyzeCommandInjection(req.Code, req.FilePath, req.Language)...)

	// Rule 5: Path Traversal
	allFindings = append(allFindings, rules.AnalyzePathTraversal(req.Code, req.FilePath, req.Language)...)

	// Rule 6: Weak Cryptography
	allFindings = append(allFindings, rules.AnalyzeWeakCrypto(req.Code, req.FilePath, req.Language)...)

	// Rule 7: Dead Code (Info severity)
	allFindings = append(allFindings, rules.AnalyzeDeadCode(req.Code, req.FilePath, req.Language)...)

	// Rule 8: Missing Error Handling
	allFindings = append(allFindings, rules.AnalyzeErrorHandling(req.Code, req.FilePath, req.Language)...)

	// Rule 9: Broken Authentication
	allFindings = append(allFindings, rules.AnalyzeBrokenAuth(req.Code, req.FilePath, req.Language)...)

	// Rule 10: Insecure Deserialization
	allFindings = append(allFindings, rules.AnalyzeInsecureDeserialization(req.Code, req.FilePath, req.Language)...)

	return types.AnalysisResponse{
		Findings: allFindings,
	}, nil
}
