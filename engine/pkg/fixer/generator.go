package fixer

import (
	"regexp"
	"strings"

	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

// FixGenerator defines the signature for rule-specific correction logic
type FixGenerator func(line int, code string, lang string) *types.QuickFix

var registry = make(map[string]FixGenerator)

func init() {
	// Register default generators for core rules
	registry["hardcoded-secrets"] = generateSecretFix
	registry["sql-injection"] = generateSQLFix
	registry["xss"] = generateXSSFix
	registry["command-injection"] = generateCommandFix
	registry["dead-code"] = generateDeadCodeFix
	registry["broken-authentication"] = generateAuthFix
	registry["path-traversal"] = generatePathFix
	registry["weak-crypto"] = generateCryptoFix
	registry["missing-error-handling"] = generateErrorFix
	registry["insecure-deserialization"] = generateDeserializationFix
}

// GetFix retrieves a formatted QuickFix from the centralized registry
func GetFix(ruleID string, line int, code string, lang string) *types.QuickFix {
	if generator, ok := registry[ruleID]; ok {
		return generator(line, code, lang)
	}
	return nil
}

func generateSecretFix(line int, code string, lang string) *types.QuickFix {
	// Matches: var = "secret", var := "secret", "key": "secret"
	re := regexp.MustCompile(`(?i)([a-zA-Z_][a-zA-Z0-9_]*)\s*(:?=|\:)\s*['"]([^'"]+)['"]`)
	matches := re.FindStringSubmatch(code)

	if len(matches) > 3 {
		varName := strings.ToUpper(matches[1])
		quotedSecret := matches[0]

		var replacement string
		if lang == "javascript" || lang == "typescript" {
			// Handle assignment or object property
			if strings.Contains(quotedSecret, ":") && !strings.Contains(quotedSecret, "=") {
				replacement = matches[1] + ": process.env." + varName
			} else {
				replacement = matches[1] + " = process.env." + varName
			}
		} else {
			replacement = matches[1] + " = os.getenv('" + varName + "')"
		}

		newCode := strings.Replace(code, matches[0], replacement, 1)
		return &types.QuickFix{
			Title:     "Extract to environment variable",
			NewCode:   strings.TrimSpace(newCode),
			StartLine: line,
			EndLine:   line,
		}
	}

	return &types.QuickFix{
		Title:     "Use environment variable",
		NewCode:   "os.getenv('SECRET_VAR')",
		StartLine: line,
		EndLine:   line,
	}
}

func generateSQLFix(line int, code string, lang string) *types.QuickFix {
	// Pattern 1: Python f-string .execute(f"SQL {var}")
	reFString := regexp.MustCompile(`\.(execute|query|raw)\(f['"](.+)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(.+)['"]\)`)
	// Pattern 2: Concatenation .execute("SQL " + var)
	reConcat := regexp.MustCompile(`\.(execute|query|raw)\(['"](.+)['"]\s*\+\s*([a-zA-Z_][a-zA-Z0-9_]*)`)
	// Pattern 3: Template literal `SQL ${var}`
	reTemplate := regexp.MustCompile("`(.+)\\$\\{([a-zA-Z_][a-zA-Z0-9_]*)\\}(.+)`")

	if matches := reFString.FindStringSubmatch(code); len(matches) > 3 {
		queryBase := matches[2] + "?" + matches[4]
		newCode := strings.Replace(code, matches[0], "."+matches[1]+"(\""+queryBase+"\", ("+matches[3]+",))", 1)
		return &types.QuickFix{
			Title:     "Use parameterized query",
			NewCode:   strings.TrimSpace(newCode),
			StartLine: line,
			EndLine:   line,
		}
	}

	if matches := reConcat.FindStringSubmatch(code); len(matches) > 3 {
		queryBase := matches[2] + "?"
		newCode := strings.Replace(code, matches[0], "."+matches[1]+"(\""+queryBase+"\", ("+matches[3]+",))", 1)
		return &types.QuickFix{
			Title:     "Use parameterized query",
			NewCode:   strings.TrimSpace(newCode),
			StartLine: line,
			EndLine:   line,
		}
	}

	if matches := reTemplate.FindStringSubmatch(code); len(matches) > 3 {
		queryBase := matches[1] + "$1" + matches[3]
		newCode := strings.Replace(code, matches[0], "`"+queryBase+"`, ["+matches[2]+"]", 1)
		return &types.QuickFix{
			Title:     "Use parameterized query",
			NewCode:   strings.TrimSpace(newCode),
			StartLine: line,
			EndLine:   line,
		}
	}

	return &types.QuickFix{
		Title:     "Use parameterized placeholders",
		NewCode:   "db.execute(\"SELECT * FROM table WHERE id = ?\", (id,))",
		StartLine: line,
		EndLine:   line,
	}
}

func generateXSSFix(line int, code string, lang string) *types.QuickFix {
	newCode := strings.Replace(code, "innerHTML", "textContent", 1)
	newCode = strings.Replace(newCode, "dangerouslySetInnerHTML", "children", 1)
	return &types.QuickFix{
		Title:     "Use safe property instead of innerHTML",
		NewCode:   strings.TrimSpace(newCode),
		StartLine: line,
		EndLine:   line,
	}
}

func generateCommandFix(line int, code string, lang string) *types.QuickFix {
	if strings.Contains(code, "os.system") {
		re := regexp.MustCompile(`os\.system\(([^)]+)\)`)
		matches := re.FindStringSubmatch(code)
		if len(matches) > 1 {
			newCode := strings.Replace(code, matches[0], "subprocess.run(["+matches[1]+"], check=True)", 1)
			return &types.QuickFix{
				Title:     "Use subprocess.run for security",
				NewCode:   strings.TrimSpace(newCode),
				StartLine: line,
				EndLine:   line,
			}
		}
	}

	if strings.Contains(code, "exec(") {
		return &types.QuickFix{
			Title:     "Replace shell exec with spawn/execFile",
			NewCode:   "child_process.execFile(\"command\", [args])",
			StartLine: line,
			EndLine:   line,
		}
	}

	return &types.QuickFix{
		Title:     "Use secure execution API",
		NewCode:   "subprocess.run([\"cmd\", arg1], check=True)",
		StartLine: line,
		EndLine:   line,
	}
}

func generateDeadCodeFix(line int, code string, lang string) *types.QuickFix {
	return &types.QuickFix{
		Title:     "Remove unused variable",
		NewCode:   "",
		StartLine: line,
		EndLine:   line,
	}
}

func generateAuthFix(line int, code string, lang string) *types.QuickFix {
	return generateSecretFix(line, code, lang)
}

func generatePathFix(line int, code string, lang string) *types.QuickFix {
	newCode := "safe_path = os.path.normpath(os.path.join(base_dir, filename))"
	if lang == "javascript" || lang == "typescript" {
		newCode = "const safePath = path.resolve(baseDir, filename);"
	}
	return &types.QuickFix{
		Title:     "Normalize path for security",
		NewCode:   newCode,
		StartLine: line,
		EndLine:   line,
	}
}

func generateCryptoFix(line int, code string, lang string) *types.QuickFix {
	newCode := code
	newCode = strings.Replace(newCode, "md5", "sha256", 1)
	newCode = strings.Replace(newCode, "sha1", "sha256", 1)

	return &types.QuickFix{
		Title:     "Upgrade to SHA256",
		NewCode:   strings.TrimSpace(newCode),
		StartLine: line,
		EndLine:   line,
	}
}

func generateErrorFix(line int, code string, lang string) *types.QuickFix {
	newCode := strings.Replace(code, "pass", "logger.error(\"Operation failed\")", 1)
	if lang == "javascript" || lang == "typescript" {
		if strings.Contains(code, "{}") {
			newCode = strings.Replace(code, "{}", "{ console.error(\"Operation failed\"); }", 1)
		} else {
			newCode = code + " // TODO: Add error handling"
		}
	}
	return &types.QuickFix{
		Title:     "Add error logging",
		NewCode:   strings.TrimSpace(newCode),
		StartLine: line,
		EndLine:   line,
	}
}

func generateDeserializationFix(line int, code string, lang string) *types.QuickFix {
	newCode := strings.Replace(code, "pickle.loads", "json.loads", 1)
	newCode = strings.Replace(newCode, "yaml.load", "yaml.safe_load", 1)

	if lang == "javascript" || lang == "typescript" {
		newCode = strings.Replace(code, "eval(", "JSON.parse(", 1)
	}
	return &types.QuickFix{
		Title:     "Use safe deserialization",
		NewCode:   strings.TrimSpace(newCode),
		StartLine: line,
		EndLine:   line,
	}
}
