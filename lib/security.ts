/**
 * Validates that a URL is public and not pointing to internal infrastructure.
 * Prevents SSRF attacks via the custom baseUrl field.
 */
export function isSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Only allow http and https
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();

    // Block IPv6 local/private addresses
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      const ipv6 = hostname.slice(1, -1);
      
      // Loopback
      if (ipv6 === "::1" || ipv6 === "0:0:0:0:0:0:0:1" || ipv6 === "::" || ipv6 === "0:0:0:0:0:0:0:0") {
        return false;
      }
      
      // Link-local (fe80::/10) and Unique Local (fc00::/7)
      if (
        ipv6.startsWith("fe80:") ||
        ipv6.startsWith("fc00:") ||
        ipv6.startsWith("fd00:")
      ) {
        return false;
      }

      // IPv4-mapped IPv6 address: e.g. ::ffff:127.0.0.1
      if (ipv6.startsWith("::ffff:")) {
        const mappedIp = ipv6.slice(7);
        if (isPrivateIpv4(mappedIp)) {
          return false;
        }
      }
      
      return true;
    }

    // Block localhost and common internal names
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }

    // Block private IP ranges (RFC 1918)
    if (isPrivateIpv4(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isPrivateIpv4(ip: string): boolean {
  const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipPattern);
  if (match) {
    const [, o1, o2] = match.map(Number);
    // Block:
    // 10.0.0.0 - 10.255.255.255
    // 172.16.0.0 - 172.31.255.255
    // 192.168.0.0 - 192.168.255.255
    // 169.254.0.0 - 169.254.255.255
    // 127.0.0.0 - 127.255.255.255 (loopback)
    // 0.0.0.0 - 0.255.255.255 (current network)
    if (o1 === 10) return true;
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    if (o1 === 192 && o2 === 168) return true;
    if (o1 === 169 && o2 === 254) return true;
    if (o1 === 127) return true;
    if (o1 === 0) return true;
  }
  return false;
}

/**
 * Sanitizes and validates the LLM response structure.
 * Prevents "garbage" or malicious scripts from entering the app state.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function validateAnalysis(data: any): any {
  const schema = {
    matchScore: typeof data.matchScore === 'number' ? Math.min(100, Math.max(0, data.matchScore)) : 0,
    matchedSkills: Array.isArray(data.matchedSkills) ? data.matchedSkills.map((s: any) => escapeHtml(String(s || ""))).slice(0, 50) : [],
    missingSkills: Array.isArray(data.missingSkills) ? data.missingSkills.map((s: any) => escapeHtml(String(s || ""))).slice(0, 50) : [],
    keywordGaps: Array.isArray(data.keywordGaps) ? data.keywordGaps.map((g: any) => ({
      keyword: escapeHtml(String(g.keyword || "")).slice(0, 100),
      importance: ["high", "medium", "low"].includes(g.importance) ? g.importance : "low",
      context: escapeHtml(String(g.context || "")).slice(0, 200)
    })).slice(0, 20) : [],
    improvementSuggestions: Array.isArray(data.improvementSuggestions) ? data.improvementSuggestions.map((s: any) => escapeHtml(String(s || ""))).slice(0, 10) : []
  };
  return schema;
}

/**
 * Sanitizes input text to prevent prompt injection by stripping XML/HTML tags
 * that could attempt to close prompt wrappers (e.g. </UNTRUSTED_RESUME_CONTENT>).
 */
export function sanitizePromptContent(text: string): string {
  if (typeof text !== "string") return "";
  // Strip any tag-like construct: <something> or </something>
  return text.replace(/<\/?[a-zA-Z_][a-zA-Z0-9_\-.:]*>/g, "");
}
