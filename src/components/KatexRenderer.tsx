import React, { useMemo } from 'react';
import katex from 'katex';

interface KatexRendererProps {
  text: string;
  isFormula?: boolean; // If true, treats the entire text as a single KaTeX math block
  className?: string;
  inline?: boolean;
}

export const KatexRenderer: React.FC<KatexRendererProps> = ({
  text,
  isFormula = false,
  className = '',
  inline = true,
}) => {
  const renderedContent = useMemo(() => {
    if (!text) return '';

    // Case 1: Treat the entire string as a pure mathematical formula
    if (isFormula) {
      try {
        return (
          <span
            className={className}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(text, {
                displayMode: !inline,
                throwOnError: false,
                trust: true,
              }),
            }}
          />
        );
      } catch (err) {
        console.error('KaTeX rendering error:', err);
        return <span className={className}>{text}</span>;
      }
    }

    // Case 2: Parse text containing mixed inline math ($...$) and block math ($$...$$)
    try {
      const parts: React.ReactNode[] = [];
      // Regex to match $$block$$ and $inline$
      const regex = /(\$\$.*?\$\$|\$.*?\$)/g;
      const tokens = text.split(regex);

      tokens.forEach((token, index) => {
        if (token.startsWith('$$') && token.endsWith('$$')) {
          const formula = token.slice(2, -2);
          const html = katex.renderToString(formula, {
            displayMode: true,
            throwOnError: false,
          });
          parts.push(
            <div
              key={index}
              className="my-2 overflow-x-auto max-w-full"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } else if (token.startsWith('$') && token.endsWith('$')) {
          const formula = token.slice(1, -1);
          const html = katex.renderToString(formula, {
            displayMode: false,
            throwOnError: false,
          });
          parts.push(
            <span
              key={index}
              className="inline-block"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } else if (token) {
          parts.push(<span key={index}>{token}</span>);
        }
      });

      return <span className={className}>{parts}</span>;
    } catch (err) {
      console.error('Mixed KaTeX parsing error:', err);
      return <span className={className}>{text}</span>;
    }
  }, [text, isFormula, className, inline]);

  return <>{renderedContent}</>;
};
