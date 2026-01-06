package rules

import (
	"regexp"
	"strings"

	"github.com/NICE-DEV226/Veil/engine/pkg/fixer"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

var weakCryptoPatterns = []struct {
	name    string
	regex   *regexp.Regexp
	message string
}{
	{
		name:    "MD5 usage",
		regex:   regexp.MustCompile(`(?i)(hashlib\.md5|createHash\(['"]md5['"]\)|CryptoJS\.MD5)`),
		message: "Weak Cryptography: MD5 is deprecated and insecure for hashing sensitive data.",
	},
	{
		name:    "SHA1 usage",
		regex:   regexp.MustCompile(`(?i)(hashlib\.sha1|createHash\(['"]sha1['"]|CryptoJS\.SHA1)`),
		message: "Weak Cryptography: SHA1 is deprecated and collision-prone.",
	},
	{
		name:    "DES usage",
		regex:   regexp.MustCompile(`(?i)(Cipher\.DES|createCipher\(['"]des['"])`),
		message: "Weak Cryptography: DES is an obsolete encryption algorithm.",
	},
}

func AnalyzeWeakCrypto(code string, filePath string, lang string) []types.Finding {
	var findings []types.Finding
	lines := strings.Split(code, "\n")

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			continue
		}

		for _, p := range weakCryptoPatterns {
			if p.regex.MatchString(line) {
				loc := p.regex.FindStringIndex(line)
				findings = append(findings, types.Finding{
					Rule:         "weak-crypto",
					Severity:     "warning",
					Message:      p.message,
					Line:         i,
					Column:       loc[0],
					EndLine:      i,
					EndColumn:    loc[1],
					Explanation:  "Weak algorithms like MD5 or SHA1 can be cracked or brute-forced easily. Use SHA256 or stronger alternatives.",
					LearnMoreUrl: "https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html",
					// Generate fix using the centralized registry
					QuickFix: fixer.GetFix("weak-crypto", i, line, lang),
				})
			}
		}
	}

	return findings
}
