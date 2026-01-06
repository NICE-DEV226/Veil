package rules

import (
	"regexp"
	"strings"

	"github.com/NICE-DEV226/Veil/engine/pkg/fixer"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

var insecureDeserializationPatterns = []struct {
	name    string
	regex   *regexp.Regexp
	message string
}{
	{
		name:    "Python pickle",
		regex:   regexp.MustCompile(`pickle\.(loads|load)\(`),
		message: "Insecure Deserialization: pickle.loads() can execute arbitrary code.",
	},
	{
		name:    "Python eval",
		regex:   regexp.MustCompile(`\beval\s*\(`),
		message: "Insecure Deserialization: eval() can execute arbitrary code.",
	},
	{
		name:    "Python exec",
		regex:   regexp.MustCompile(`\bexec\s*\(`),
		message: "Insecure Deserialization: exec() can execute arbitrary code.",
	},
	{
		name:    "YAML unsafe load",
		regex:   regexp.MustCompile(`yaml\.(load|unsafe_load)\(`),
		message: "Insecure Deserialization: yaml.load() without SafeLoader is dangerous.",
	},
	{
		name:    "JS eval",
		regex:   regexp.MustCompile(`\beval\s*\(`),
		message: "Insecure Deserialization: eval() can execute arbitrary code.",
	},
}

func AnalyzeInsecureDeserialization(code string, filePath string, lang string) []types.Finding {
	var findings []types.Finding
	lines := strings.Split(code, "\n")

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			continue
		}

		for _, p := range insecureDeserializationPatterns {
			if p.regex.MatchString(line) {
				loc := p.regex.FindStringIndex(line)
				findings = append(findings, types.Finding{
					Rule:         "insecure-deserialization",
					Severity:     "error",
					Message:      p.message,
					Line:         i,
					Column:       loc[0],
					EndLine:      i,
					EndColumn:    loc[1],
					Explanation:  "Insecure deserialization can lead to remote code execution, replay attacks, and privilege escalation.",
					LearnMoreUrl: "https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/",
					// Generate fix using the centralized registry
					QuickFix: fixer.GetFix("insecure-deserialization", i, line, lang),
				})
			}
		}
	}

	return findings
}
