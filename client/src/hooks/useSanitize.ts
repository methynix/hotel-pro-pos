import { useMemo } from 'react';
import { sanitize } from '../utils/sanitize';

export const useSanitize = () => {
  return useMemo(
    () => ({
      text: (input: string | null | undefined) => sanitize.text(input),
      html: (input: string | null | undefined) => sanitize.html(input),
      attribute: (input: string | null | undefined) => sanitize.attribute(input),
      email: (input: string | null | undefined) => sanitize.email(input),
      url: (input: string | null | undefined) => sanitize.url(input),
    }),
    []
  );
};
