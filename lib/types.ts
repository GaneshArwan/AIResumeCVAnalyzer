export interface AnalysisResult {
  fileName: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  keywordGaps: {
    keyword: string;
    importance: "high" | "medium" | "low";
    context: string;
  }[];
  improvementSuggestions: string[];
}

export interface ComparisonResponse {
  results: AnalysisResult[];
}

export interface AnalysisError {
  error: string;
}
