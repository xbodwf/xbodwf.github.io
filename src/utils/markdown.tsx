import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import hljs from "highlight.js";
import { ContentCopy, Check } from "@mui/icons-material";
import { useTheme } from "../contexts/ThemeContext";
import ThemeManager from "./themeManager";
import "./CodeBlock.css";

// 语言显示名映射
const getLanguageDisplayName = (lang: string): string => {
  const languageMap: Record<string, string> = {
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    jsx: "JSX",
    tsx: "TSX",
    py: "Python",
    python: "Python",
    java: "Java",
    cpp: "C++",
    c: "C",
    cs: "C#",
    csharp: "C#",
    php: "PHP",
    rb: "Ruby",
    ruby: "Ruby",
    go: "Go",
    rust: "Rust",
    swift: "Swift",
    kotlin: "Kotlin",
    dart: "Dart",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    sass: "Sass",
    less: "Less",
    json: "JSON",
    xml: "XML",
    yaml: "YAML",
    yml: "YAML",
    toml: "TOML",
    ini: "INI",
    sql: "SQL",
    bash: "Bash",
    sh: "Shell",
    powershell: "PowerShell",
    ps1: "PowerShell",
    dockerfile: "Dockerfile",
    makefile: "Makefile",
    markdown: "Markdown",
    md: "Markdown",
    text: "Text",
    txt: "Text",
    plaintext: "Text",
  };
  return languageMap[lang?.toLowerCase?.()] || lang?.toUpperCase?.() || "Text";
};

// 代码块组件
const CodeBlock = ({
  code,
  language = "text",
  className = "",
}: {
  code: string;
  language?: string;
  className?: string;
}) => {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [themeLoading, setThemeLoading] = useState(false);
  const { theme } = useTheme?.() || { theme: "light" };

  useEffect(() => {
    const loadTheme = async () => {
      setThemeLoading(true);
      try {
        const themeManager = ThemeManager.getInstance();
        await themeManager.loadHighlightTheme(theme);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load theme:", error);
      } finally {
        setThemeLoading(false);
      }
    };
    loadTheme();
  }, [theme]);

  useEffect(() => {
    if (!themeLoading && codeRef.current) {
      codeRef.current.removeAttribute("data-highlighted");
      codeRef.current.className = `language-${language}`;
      try {
        hljs.highlightElement(codeRef.current);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Highlight error:", error);
      }
    }
  }, [code, language, theme, themeLoading]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to copy code:", err);
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        // eslint-disable-next-line no-console
        console.error("Fallback copy failed:", fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className={`code-block ${className} ${themeLoading ? "theme-loading" : ""}`}>
      <div className="code-header">
        <span className="code-language">{getLanguageDisplayName(language)}</span>
        <button
          className="copy-button"
          onClick={copyToClipboard}
          aria-label="Copy code to clipboard"
          title={copied ? "Copied!" : "Copy"}
        >
          {copied ? <Check /> : <ContentCopy />}
          <span className="copy-text">{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <pre className="code-pre">
        <code ref={codeRef} className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

// 递归提取所有文本内容
function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (typeof children === "object" && children && "props" in children)
    return extractText((children as any).props.children);
  return "";
}

// Markdown 组件
const Markdown = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeHighlight]}
      components={{
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        code({ className = "", children, node: _node, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          // 使用 extractText 提取文本
          const codeString = extractText(children);
          if (match) {
            return (
              <CodeBlock
                code={codeString.replace(/\n$/, "")}
                language={match[1]}
                className={className}
              />
            );
          }
          return (
            <code className={`inline-code ${className}`} {...props}>
              {codeString}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default Markdown;