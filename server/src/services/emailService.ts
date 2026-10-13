import env from '../config/env';

const RESEND_URL = 'https://api.resend.com/emails';

export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

interface EmailContent {
  heading: string;
  /** Plain-text paragraphs; escaped before rendering. */
  paragraphs: string[];
  /** Optional key/value rows shown as a small ledger table. */
  rows?: { label: string; value: string }[];
  action?: { label: string; path: string };
}

/** Plain, readable HTML that matches the app's paper-and-ink look. */
export function renderEmail({ heading, paragraphs, rows, action }: EmailContent): string {
  const actionUrl = action ? `${env.CLIENT_URL.replace(/\/$/, '')}${action.path}` : '';
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F5F4EF;font-family:'IBM Plex Sans',Helvetica,Arial,sans-serif;color:#1A1916;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F4EF;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E3E1DA;border-radius:6px;">
          <tr><td style="padding:20px 28px;border-bottom:1px solid #E3E1DA;font-size:17px;font-weight:600;">
            ledger<span style="color:#2A6249;">HQ</span>
          </td></tr>
          <tr><td style="padding:28px;">
            <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;">${escapeHtml(heading)}</h1>
            ${paragraphs
              .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#33322E;">${escapeHtml(p)}</p>`)
              .join('')}
            ${
              rows && rows.length
                ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 18px;border:1px solid #E3E1DA;border-radius:4px;">
                    ${rows
                      .map(
                        (r, i) => `<tr>
                          <td style="padding:10px 14px;font-size:14px;color:#6E6C64;${i ? 'border-top:1px solid #E3E1DA;' : ''}">${escapeHtml(r.label)}</td>
                          <td align="right" style="padding:10px 14px;font-size:14px;font-family:'IBM Plex Mono',Menlo,monospace;${i ? 'border-top:1px solid #E3E1DA;' : ''}">${escapeHtml(r.value)}</td>
                        </tr>`
                      )
                      .join('')}
                  </table>`
                : ''
            }
            ${
              action
                ? `<a href="${escapeHtml(actionUrl)}" style="display:inline-block;margin-top:6px;padding:10px 16px;background:#1A1916;color:#FFFFFF;text-decoration:none;border-radius:4px;font-size:14px;font-weight:500;">${escapeHtml(action.label)}</a>`
                : ''
            }
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid #E3E1DA;font-size:12px;color:#6E6C64;line-height:1.5;">
            You are receiving this because you have a ledgerHQ account. You can change which emails you get in Settings, Notifications.<br/>
            Methynix Software &middot; info@methynix.com &middot; 0715 455 422
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export const emailService = {
  isEnabled(): boolean {
    return !!env.RESEND_API_KEY;
  },

  /** Sends one email. Never throws: email failures must not break the request that triggered them. */
  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!env.RESEND_API_KEY) return false;
    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, reply_to: 'info@methynix.com' }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Email to ${to} failed (${res.status}): ${body.slice(0, 300)}`);
        return false;
      }
      return true;
    } catch (error) {
      console.error(`Email to ${to} failed:`, error instanceof Error ? error.message : error);
      return false;
    }
  },
};
