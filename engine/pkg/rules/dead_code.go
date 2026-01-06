package rules

import (
	"regexp"
	"strings"

	"github.com/NICE-DEV226/Veil/engine/pkg/fixer"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

// Simplified Dead Code detection for MVP
// Focuses on variables declared and not used in the same file
func AnalyzeDeadCode(code string, filePath string, lang string) []types.Finding {
	var findings []types.Finding
	lines := strings.Split(code, "\n")

	// 1. Identify potential declarations (Python/JS/TS)
	// Example: var name = ..., const name = ..., let name = ..., name = ... (at start of line)
	declRegex := regexp.MustCompile(`(?m)^(?:var|const|let|)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=`)

	declarations := make(map[string]int) // name -> line index
	for i, line := range lines {
		m := declRegex.FindStringSubmatch(line)
		if len(m) > 1 {
			name := m[1]
			// Avoid false positives for very common names or keywords
			if len(name) < 2 {
				continue
			}
			declarations[name] = i
		}
	}

	// 2. Count usages
	for name, lineIdx := range declarations {
		// Count occurrences of the variable name
		// We use a word boundary regex to avoid matching inside other words
		usageRegex := regexp.MustCompile(`\b` + name + `\b`)
		allMatches := usageRegex.FindAllString(code, -1)

		// If only 1 match exists, it's just the declaration
		if len(allMatches) <= 1 {
			findings = append(findings, types.Finding{
				Rule:         "dead-code",
				Severity:     "info",
				Message:      "Unused variable detected: '" + name + "'.",
				Line:         lineIdx,
				Column:       0, // simplified
				EndLine:      lineIdx,
				EndColumn:    len(lines[lineIdx]),
				Explanation:  "Keeping unused variables makes the code harder to read and maintain.",
				LearnMoreUrl: "https://en.wikipedia.org/wiki/Dead_code",
				// Generate fix using the centralized registry
				QuickFix: fixer.GetFix("dead-code", lineIdx, lines[lineIdx], lang),
			})
		}
	}

	return findings
}
