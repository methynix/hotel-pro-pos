import React from 'react';
import { sanitize } from './sanitize';

interface SafeTextProps {
  children: string | null | undefined;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

export const SafeText: React.FC<SafeTextProps> = ({
  children,
  as: Component = 'span',
  className
}) => {
  const cleanText = sanitize.text(children);
  return React.createElement(Component, { className }, cleanText);
};

interface SafeHtmlProps {
  html: string | null | undefined;
  className?: string;
}

export const SafeHtml: React.FC<SafeHtmlProps> = ({ html, className }) => {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitize.html(html) }}
    />
  );
};
