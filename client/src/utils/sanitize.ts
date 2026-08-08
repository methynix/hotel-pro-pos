import DOMPurify from 'dompurify';

export interface SanitizeConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
}

const DEFAULT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

export const sanitize = {
  text: (input: string | null | undefined): string => {
    if (!input) return '';
    return DOMPurify.sanitize(input, {
      ...DEFAULT_CONFIG,
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    }).trim();
  },

  html: (input: string | null | undefined, config?: DOMPurify.Config): string => {
    if (!input) return '';
    return DOMPurify.sanitize(input, { ...DEFAULT_CONFIG, ...config }).trim();
  },

  attribute: (input: string | null | undefined): string => {
    if (!input) return '';
    return input
      .replace(/[<>'"]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .trim();
  },

  email: (input: string | null | undefined): string => {
    if (!input) return '';
    return input.toLowerCase().trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) ? input.toLowerCase().trim() : '';
  },

  url: (input: string | null | undefined): string => {
    if (!input) return '';
    try {
      const url = new URL(input);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
      return '';
    } catch {
      return '';
    }
  },
};

export const renderSafeHtml = (html: string | null | undefined) => {
  if (!html) return '';
  return { __html: sanitize.html(html) };
};
