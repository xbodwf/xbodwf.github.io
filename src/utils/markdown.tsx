import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkEmoji from "remark-emoji";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
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
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (typeof children === "object" && children && "props" in children)
    return extractText((children as any).props.children);
  return "";
}

const isExternalLink = (href?: string) => !!href && /^(https?:)?\/\//i.test(href);

// Markdown 组件
const Markdown = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, [remarkEmoji, { emoticon: false }]]}
      rehypePlugins={[rehypeSlug, rehypeHighlight]}
      components={{
        // 块级代码统一交给 CodeBlock 渲染（包括没有指定语言的情况）
        pre({ children }) {
          const child = React.Children.toArray(children)[0];
          if (!React.isValidElement(child)) {
            return <pre>{children}</pre>;
          }
          const childProps = child.props as {
            className?: string;
            children?: React.ReactNode;
          };
          const match = /language-([\w-]+)/.exec(childProps.className || "");
          const code = extractText(childProps.children).replace(/\n$/, "");
          return (
            <CodeBlock
              code={code}
              language={match?.[1] || "text"}
              className={childProps.className || ""}
            />
          );
        },
        // 走到这里的只会是行内代码
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        code({ className = "", children, node: _node, ...props }) {
          return (
            <code className={`inline-code ${className}`} {...props}>
              {children}
            </code>
          );
        },
        a({ href, children, ...props }) {
          if (isExternalLink(href)) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          }
          return (
            <a href={href} {...props}>
              {children}
            </a>
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        img({ node: _node, ...props }) {
          return <img loading="lazy" decoding="async" {...props} />;
        },
        // 表格横向滚动，避免窄屏溢出
        table({ children }) {
          return (
            <div className="table-wrapper">
              <table>{children}</table>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default Markdown;
