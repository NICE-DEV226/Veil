package rules

import (
	"regexp"
	"strings"

	"github.com/NICE-DEV226/Veil/engine/pkg/fixer"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

var pathTraversalPatterns = []struct {
	name    string
	regex   *regexp.Regexp
	message string
}{
	{
		name:    "Python Open with variable",
		regex:   regexp.MustCompile(`open\s*\(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*(,|\))`),
		message: "Potential Path Traversal: opening a file using an unvalidated variable.",
	},
	{
		name:    "Node.js fs.readFile with variable",
		regex:   regexp.MustCompile(`fs\.(readFile|readFileSync|writeFile|writeFileSync)\s*\(\s*[a-zA-Z_][a-zA-Z0-9_]*`),
		message: "Potential Path Traversal: Node.js file operation using an unvalidated variable.",
	},
	{
		name:    "Path concatenation",
		regex:   regexp.MustCompile(`['"].*/.*['"]\s*\+\s*[a-zA-Z_][a-zA-Z0-9_]*`),
		message: "Potential Path Traversal: string concatenation detected in a file path.",
	},
}

func AnalyzePathTraversal(code string, filePath string, lang string) []types.Finding {
	var findings []types.Finding
	lines := strings.Split(code, "\n")

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			continue
		}

		// Skip if validation/sanitization is present on the same line (basic check)
		if strings.Contains(line, "os.path.abspath") || strings.Contains(line, "path.resolve") || strings.Contains(line, "path.join") {
			continue
		}

		for _, p := range pathTraversalPatterns {
			if p.regex.MatchString(line) {
				loc := p.regex.FindStringIndex(line)
				findings = append(findings, types.Finding{
					Rule:         "path-traversal",
					Severity:     "error",
					Message:      p.message,
					Line:         i,
					Column:       loc[0],
					EndLine:      i,
					EndColumn:    loc[1],
					Explanation:  "Relative path values like '../' can be used to access sensitive files outside the intended directory. Always sanitize or use absolute paths.",
					LearnMoreUrl: "https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Security_Cheat_Sheet.html",
					// Generate fix using the centralized registry
					QuickFix: fixer.GetFix("path-traversal", i, line, lang),
				})
			}
		}
	}

	return findings
}
