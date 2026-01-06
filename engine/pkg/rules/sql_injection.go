package rules

import (
	"regexp"
	"strings"

	"github.com/NICE-DEV226/Veil/engine/pkg/fixer"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

var sqlFuncPatterns = []string{
	`\.execute\(`,
	`\.query\(`,
	`\.raw\(`,
	`\.run\(`,
}

// Regex to detect f-strings or template literals with variables in SQL-like context
var sqlInjectionPatterns = []struct {
	name    string
	regex   *regexp.Regexp
	message string
}{
	{
		name: "Python F-String SQL",
		// Matches .execute(f"SELECT ... {var}")
		regex:   regexp.MustCompile(`\.(execute|query|raw)\(f['"].*(SELECT|INSERT|UPDATE|DELETE).+\{[a-zA-Z_][a-zA-Z0-9_]*\}.*['"]\)`),
		message: "Potential SQL Injection: detected f-string with variable interpolation in a database query.",
	},
	{
		name: "JavaScript Template Literal SQL",
		// Matches .query(`SELECT ... ${var}`)
		regex:   regexp.MustCompile(`\.(execute|query|raw)\(\s*` + "`" + `.*(SELECT|INSERT|UPDATE|DELETE).+\$\{[a-zA-Z_][a-zA-Z0-9_]*\}.*` + "`" + `\s*\)`),
		message: "Potential SQL Injection: detected template literal with variable interpolation in a database query.",
	},
	{
		name: "String Concatenation SQL",
		// Matches .execute("SELECT ... " + var)
		regex:   regexp.MustCompile(`\.(execute|query|raw)\(['"].*(SELECT|INSERT|UPDATE|DELETE).+['"]\s*\+\s*[a-zA-Z_][a-zA-Z0-9_]*`),
		message: "Potential SQL Injection: detected string concatenation in a database query.",
	},
}

func AnalyzeSQLInjection(code string, filePath string, lang string) []types.Finding {
	var findings []types.Finding
	lines := strings.Split(code, "\n")

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			continue
		}

		for _, p := range sqlInjectionPatterns {
			if p.regex.MatchString(line) {
				loc := p.regex.FindStringIndex(line)
				finding := types.Finding{
					Rule:         "sql-injection",
					Severity:     "error",
					Message:      p.message,
					Line:         i,
					Column:       loc[0],
					EndLine:      i,
					EndColumn:    loc[1],
					Explanation:  "User input should never be directly included in SQL strings. This allows attackers to manipulate the query structure.",
					LearnMoreUrl: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
				}

				// Generate fix using the centralized registry
				finding.QuickFix = fixer.GetFix("sql-injection", i, line, lang)

				findings = append(findings, finding)
			}
		}
	}

	return findings
}
