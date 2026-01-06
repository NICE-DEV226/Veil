package rules

import (
	"regexp"
	"strings"

	"github.com/NICE-DEV226/Veil/engine/pkg/fixer"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

var errorHandlingPatterns = []struct {
	name    string
	regex   *regexp.Regexp
	message string
}{
	{
		name:    "Python except pass",
		regex:   regexp.MustCompile(`except.*:\s*pass`),
		message: "Missing Error Handling: empty except block with 'pass' detected.",
	},
	{
		name:    "JS/TS empty catch",
		regex:   regexp.MustCompile(`catch\s*\([a-zA-Z0-9_]*\)\s*\{\s*\}`),
		message: "Missing Error Handling: empty catch block detected.",
	},
	{
		name:    "Go ignore error",
		regex:   regexp.MustCompile(`[a-zA-Z0-9_]*\s*,\s*_\s*:=`),
		message: "Missing Error Handling: error explicitly ignored using '_'.",
	},
}

func AnalyzeErrorHandling(code string, filePath string, lang string) []types.Finding {
	var findings []types.Finding
	lines := strings.Split(code, "\n")

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			continue
		}

		for _, p := range errorHandlingPatterns {
			if p.regex.MatchString(line) {
				loc := p.regex.FindStringIndex(line)
				findings = append(findings, types.Finding{
					Rule:         "missing-error-handling",
					Severity:     "warning",
					Message:      p.message,
					Line:         i,
					Column:       loc[0],
					EndLine:      i,
					EndColumn:    loc[1],
					Explanation:  "Ignoring errors can lead to silent failures and unexpected behavior. Always handle or log exceptions.",
					LearnMoreUrl: "https://owasp.org/www-community/vulnerabilities/Improper_Error_Handling",
					// Generate fix using the centralized registry
					QuickFix: fixer.GetFix("missing-error-handling", i, line, lang),
				})
			}
		}
	}

	return findings
}
