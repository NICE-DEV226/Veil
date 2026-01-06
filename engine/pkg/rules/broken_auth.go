package rules

import (
	"regexp"
	"strings"

	"github.com/NICE-DEV226/Veil/engine/pkg/fixer"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

var brokenAuthPatterns = []struct {
	name    string
	regex   *regexp.Regexp
	message string
}{
	{
		name:    "Hardcoded JWT secret",
		regex:   regexp.MustCompile(`(?i)(jwt_secret|secret_key)\s*=\s*['"][^'"]{1,20}['"]`),
		message: "Broken Authentication: hardcoded JWT secret detected.",
	},
	{
		name:    "Weak session config",
		regex:   regexp.MustCompile(`(?i)session\.(cookie_secure|cookie_httponly)\s*=\s*False`),
		message: "Broken Authentication: insecure session cookie configuration.",
	},
	{
		name:    "No password validation",
		regex:   regexp.MustCompile(`(?i)password\s*=\s*request\.(form|json|data)\[['"]password['"]\]`),
		message: "Broken Authentication: password accepted without validation.",
	},
	{
		name:    "Weak JWT algorithm",
		regex:   regexp.MustCompile(`(?i)algorithm\s*[:=]\s*['"]none['"]`),
		message: "Broken Authentication: JWT algorithm set to 'none' (insecure).",
	},
}

func AnalyzeBrokenAuth(code string, filePath string, lang string) []types.Finding {
	var findings []types.Finding
	lines := strings.Split(code, "\n")

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			continue
		}

		for _, p := range brokenAuthPatterns {
			if p.regex.MatchString(line) {
				loc := p.regex.FindStringIndex(line)
				findings = append(findings, types.Finding{
					Rule:         "broken-authentication",
					Severity:     "error",
					Message:      p.message,
					Line:         i,
					Column:       loc[0],
					EndLine:      i,
					EndColumn:    loc[1],
					Explanation:  "Weak authentication mechanisms allow attackers to compromise passwords, keys, or session tokens.",
					LearnMoreUrl: "https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/",
					// Generate fix using the centralized registry
					QuickFix: fixer.GetFix("broken-authentication", i, line, lang),
				})
			}
		}
	}

	return findings
}
