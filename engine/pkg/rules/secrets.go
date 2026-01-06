package rules

import (
	"regexp"
	"strings"

	"github.com/NICE-DEV226/Veil/engine/pkg/fixer"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

var secretPatterns = []struct {
	name    string
	regex   *regexp.Regexp
	message string
}{
	{
		name:    "AWS Key",
		regex:   regexp.MustCompile(`AKIA[0-9A-Z]{16}`),
		message: "Potential AWS Access Key ID detected.",
	},
	{
		name:    "GitHub Token",
		regex:   regexp.MustCompile(`ghp_[a-zA-Z0-9]{36}`),
		message: "Potential GitHub Personal Access Token detected.",
	},
	{
		name:    "Private Key",
		regex:   regexp.MustCompile(`-----BEGIN PRIVATE KEY-----`),
		message: "Hardcoded Private Key detected.",
	},
	{
		name:    "Generic Secret",
		regex:   regexp.MustCompile(`(?i)(password|secret|token|api_key)\s*=\s*['"][^'"]{8,}['"]`),
		message: "Potential hardcoded secret or password detected.",
	},
}

func AnalyzeSecrets(code string, filePath string, lang string) []types.Finding {
	var findings []types.Finding

	// Simple line-by-line scanning for MVP
	lines := strings.Split(code, "\n")
	for i, line := range lines {
		// Basic skip for comments (very simple, tree-sitter will improve this later)
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			continue
		}

		for _, p := range secretPatterns {
			if p.regex.MatchString(line) {
				loc := p.regex.FindStringIndex(line)
				finding := types.Finding{
					Rule:         "hardcoded-secrets",
					Severity:     "error",
					Message:      p.message,
					Line:         i,
					Column:       loc[0],
					EndLine:      i,
					EndColumn:    loc[1],
					Explanation:  "Keeping secrets in source code is highly insecure. They can be exposed if the code is shared or compromised.",
					LearnMoreUrl: "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
				}

				// Use centralized fixer registry
				finding.QuickFix = fixer.GetFix("hardcoded-secrets", i, line, lang)

				findings = append(findings, finding)
			}
		}
	}

	return findings
}
