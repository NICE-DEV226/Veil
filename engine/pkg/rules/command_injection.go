package rules

import (
	"regexp"
	"strings"

	"github.com/NICE-DEV226/Veil/engine/pkg/fixer"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

var commandInjectionPatterns = []struct {
	name    string
	regex   *regexp.Regexp
	message string
}{
	{
		name:    "os.system",
		regex:   regexp.MustCompile(`os\.system\s*\(.*\)`),
		message: "Potential Command Injection: use of os.system() detected.",
	},
	{
		name:    "subprocess shell=True",
		regex:   regexp.MustCompile(`subprocess\.(call|run|Popen)\s*\(.*shell\s*=\s*True.*\)`),
		message: "Potential Command Injection: use of subprocess with shell=True detected.",
	},
	{
		name:    "child_process.exec",
		regex:   regexp.MustCompile(`(child_process\.)?exec\s*\(.*\)`),
		message: "Potential Command Injection: use of exec() detected.",
	},
}

func AnalyzeCommandInjection(code string, filePath string, lang string) []types.Finding {
	var findings []types.Finding
	lines := strings.Split(code, "\n")

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			continue
		}

		for _, p := range commandInjectionPatterns {
			if p.regex.MatchString(line) {
				loc := p.regex.FindStringIndex(line)
				findings = append(findings, types.Finding{
					Rule:         "command-injection",
					Severity:     "error",
					Message:      p.message,
					Line:         i,
					Column:       loc[0],
					EndLine:      i,
					EndColumn:    loc[1],
					Explanation:  "Command Injection vulnerabilities occur when an application passes unsafe user-controlled input to a system shell. Always sanitize inputs and avoid shell execution if possible.",
					LearnMoreUrl: "https://cheatsheetseries.owasp.org/cheatsheets/Command_Injection_Cheat_Sheet.html",
					// Generate fix using the centralized registry
					QuickFix: fixer.GetFix("command-injection", i, line, lang),
				})
			}
		}
	}

	return findings
}
