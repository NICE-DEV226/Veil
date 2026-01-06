package types

type Finding struct {
	Rule         string    `json:"rule"`
	Severity     string    `json:"severity"`
	Message      string    `json:"message"`
	Line         int       `json:"line"`
	Column       int       `json:"column"`
	EndLine      int       `json:"endLine"`
	EndColumn    int       `json:"endColumn"`
	Explanation  string    `json:"explanation"`
	LearnMoreUrl string    `json:"learnMoreUrl"`
	QuickFix     *QuickFix `json:"quickFix"`
}

type QuickFix struct {
	Title     string `json:"title"`
	NewCode   string `json:"newCode"`
	StartLine int    `json:"startLine"`
	EndLine   int    `json:"endLine"`
}

type AnalysisRequest struct {
	Code     string   `json:"code"`
	Language string   `json:"language"`
	FilePath string   `json:"filepath"`
}

type AnalysisResponse struct {
	Findings []Finding `json:"findings"`
}
