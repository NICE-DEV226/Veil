package rules

import (
	"regexp"
	"strings"

	"github.com/NICE-DEV226/Veil/engine/pkg/fixer"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

var xssPatterns = []struct {
	name    string
	regex   *regexp.Regexp
	message string
}{
	{
		name:    "innerHTML Assignment",
		regex:   regexp.MustCompile(`\.innerHTML\s*=\s*[a-zA-Z_][a-zA-Z0-9_]*`),
		message: "Potential XSS: direct assignment to innerHTML detected.",
	},
	{
		name:    "document.write",
		regex:   regexp.MustCompile(`document\.write\s*\(.*\)`),
		message: "Potential XSS: use of document.write detected.",
	},
	{
		name:    "dangerouslySetInnerHTML",
		regex:   regexp.MustCompile(`dangerouslySetInnerHTML\s*=\s*\{\{.*\}\}`),
		message: "Potential XSS: use of dangerouslySetInnerHTML in React detected.",
	},
}

func AnalyzeXSS(code string, filePath string, lang string) []types.Finding {
	var findings []types.Finding
	lines := strings.Split(code, "\n")

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			continue
		}

		for _, p := range xssPatterns {
			if p.regex.MatchString(line) {
				loc := p.regex.FindStringIndex(line)
				finding := types.Finding{
					Rule:         "xss",
					Severity:     "error",
					Message:      p.message,
					Line:         i,
					Column:       loc[0],
					EndLine:      i,
					EndColumn:    loc[1],
					Explanation:  "Cross-Site Scripting (XSS) vulnerabilities allow attackers to inject malicious scripts into web pages. Sanitize user input and avoid rendering untrusted HTML.",
					LearnMoreUrl: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_XSS_Cheat_Sheet.html",
				}

				// Generate fix using the centralized registry
				finding.QuickFix = fixer.GetFix("xss", i, line, lang)
				findings = append(findings, finding)
			}
		}
	}

	return findings
}
