"use client";

import { useState } from "react";
import { AnalysisResult, ComparisonResponse } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, ChevronDown, ChevronUp, ShieldCheck, X, FileText, UploadCloud } from "lucide-react";

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Configuration State
  const [showConfig, setShowConfig] = useState(false);
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-1.5-flash");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !jobDescription) {
      setError("Please provide at least one resume and a job description.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("resumes", file);
    });
    formData.append("jobDescription", jobDescription);
    formData.append("provider", provider);
    formData.append("model", model);
    formData.append("apiKey", apiKey);
    formData.append("baseUrl", baseUrl);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data: ComparisonResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || "Something went wrong");
      }

      setResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProviderDefaults = (p: string) => {
    setProvider(p);
    if (p === "gemini") setModel("gemini-1.5-flash");
    else if (p === "openai") setModel("gpt-4o-mini");
    else if (p === "anthropic") setModel("claude-3-5-sonnet-20240620");
    else if (p === "openai-compatible") setModel("");
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-6xl">
            AI Resume Analyzer <span className="text-blue-600">Pro</span>
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            Intelligent multi-resume analysis across any AI provider.
          </p>
        </motion.div>

        {/* Configuration Panel */}
        <div className="mb-8 max-w-2xl mx-auto">
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all text-gray-700 font-semibold"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <span>AI Provider & Model Settings</span>
              {apiKey && <ShieldCheck className="w-4 h-4 text-green-500" />}
            </div>
            {showConfig ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          <AnimatePresence>
            {showConfig && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-white border-x border-b border-gray-200 rounded-b-2xl shadow-inner p-6 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Provider</label>
                    <select 
                      value={provider}
                      onChange={(e) => updateProviderDefaults(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="openai-compatible">OpenAI Compatible</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Model ID</label>
                    <input 
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. gpt-4o-mini"
                      className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    API Key (Stored in session only)
                  </label>
                  <input 
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter your ${provider === 'openai-compatible' ? 'custom' : provider.charAt(0).toUpperCase() + provider.slice(1)} API key`}
                    className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {provider === "openai-compatible" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Base URL</label>
                    <input 
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.your-provider.com/v1"
                      className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-white shadow-2xl rounded-3xl p-8 mb-12 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  Resumes (PDF)
                </label>
                
                {/* Upload Zone */}
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-colors group bg-gray-50/50">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="text-center">
                    <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
                    <p className="text-gray-600 font-medium">
                      Click or drag to add resumes
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PDF only, max 5MB per file</p>
                  </div>
                </div>

                {/* File List */}
                <div className="space-y-2">
                  <AnimatePresence>
                    {selectedFiles.map((file, idx) => (
                      <motion.div
                        key={`${file.name}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate font-medium">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Job Description
                </label>
                <textarea
                  rows={10}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description here..."
                  className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4 border transition-all h-[calc(100%-2rem)]"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing with {provider}...
                </span>
              ) : "Start Analysis"}
            </motion.button>
          </form>

          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md"
            >
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-12">
          <AnimatePresence mode="popLayout">
            {results && results.map((res, idx) => (
              <motion.div
                key={res.fileName}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100"
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold truncate max-w-md">{res.fileName}</h2>
                      <p className="text-blue-100 opacity-80">Resume Analysis Report</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl px-6 py-2 flex flex-col items-center">
                      <span className="text-4xl font-black">{res.matchScore}%</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold">Match Score</span>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Matched Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {res.matchedSkills.map((skill, i) => (
                          <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        Missing Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {res.missingSkills.map((skill, i) => (
                          <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-12">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Detailed Keyword Gaps</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {res.keywordGaps.map((gap, i) => (
                        <div key={i} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-gray-900">{gap.keyword}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              gap.importance === 'high' ? 'bg-red-100 text-red-700' :
                              gap.importance === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {gap.importance}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 italic leading-relaxed">{gap.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Strategic Improvement Path</h3>
                    <div className="space-y-4">
                      {res.improvementSuggestions.map((suggestion, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-blue-50/30 border border-blue-100/50">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                            {i + 1}
                          </div>
                          <p className="text-gray-700 leading-relaxed pt-1">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

