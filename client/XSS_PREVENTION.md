# XSS Prevention Guide - ledgerHQ Frontend

## Overview
This document outlines how to prevent Cross-Site Scripting (XSS) vulnerabilities in the ledgerHQ frontend using DOMPurify.

## Installation
DOMPurify is already installed:
```bash
npm install dompurify @types/dompurify
```

## Core Tools Available

### 1. sanitize Utility (client/src/utils/sanitize.ts)
Provides safe sanitization functions for different content types:

```typescript
import { sanitize } from '@/utils/sanitize';

// Plain text - removes all HTML tags
sanitize.text('<img src=x onerror="alert(1)">') // Returns: '<img src=x onerror="alert(1)">'

// HTML - allows safe tags (b, i, em, strong, p, br)
sanitize.html('<b>Bold</b> <script>alert(1)</script>') // Returns: '<b>Bold</b>'

// Attributes - removes dangerous characters
sanitize.attribute('" onclick="alert(1)') // Returns: 'onclickalert1'

// Email - validates and lowercases
sanitize.email('USER@EXAMPLE.COM') // Returns: 'user@example.com'

// URL - validates HTTP/HTTPS only
sanitize.url('javascript:alert(1)') // Returns: ''
sanitize.url('https://example.com') // Returns: 'https://example.com'
```

### 2. SafeText Component (client/src/utils/SafeText.tsx)
React component for rendering user-generated text safely:

```typescript
import { SafeText } from '@/utils/SafeText';

<SafeText as="p">User input: {userDescription}</SafeText>
```

### 3. SafeHtml Component (client/src/utils/SafeText.tsx)
React component for rendering sanitized HTML:

```typescript
import { SafeHtml } from '@/utils/SafeText';

<SafeHtml html={userHtmlContent} className="text-sm text-secondary" />
```

### 4. useSanitize Hook (client/src/hooks/useSanitize.ts)
Custom hook for using sanitization inside components:

```typescript
import { useSanitize } from '@/hooks/useSanitize';

function MyComponent() {
  const { text, email, url } = useSanitize();
  
  const cleanName = text(userName);
  const cleanEmail = email(userEmail);
  const cleanWebsite = url(userWebsite);
  
  return <div>{cleanName}</div>;
}
```

## Usage Patterns

### Pattern 1: Display User-Generated Text
```typescript
// ❌ UNSAFE
<p>{userComment}</p>

// ✅ SAFE
<SafeText as="p">{userComment}</SafeText>
```

### Pattern 2: Dynamic HTML Content
```typescript
// ❌ UNSAFE
<div dangerouslySetInnerHTML={{ __html: userHtml }} />

// ✅ SAFE
<SafeHtml html={userHtml} />
```

### Pattern 3: Form Input Attributes
```typescript
import { sanitize } from '@/utils/sanitize';

// ❌ UNSAFE
<input placeholder={userInput} />

// ✅ SAFE
<input placeholder={sanitize.attribute(userInput)} />
```

### Pattern 4: Email Display
```typescript
import { sanitize } from '@/utils/sanitize';

// ❌ UNSAFE
<a href={`mailto:${userEmail}`}>{userEmail}</a>

// ✅ SAFE
<a href={`mailto:${sanitize.email(userEmail)}`}>
  {sanitize.email(userEmail)}
</a>
```

### Pattern 5: External Links
```typescript
import { sanitize } from '@/utils/sanitize';

// ❌ UNSAFE
<a href={userLink}>Visit</a>

// ✅ SAFE
<a href={sanitize.url(userLink)} target="_blank" rel="noopener noreferrer">
  Visit
</a>
```

## Security Rules

### RULE 1: Sanitize All User Input
Always sanitize data from:
- User form inputs
- Query parameters
- API responses (untrusted data)
- Database records (if user-editable)

### RULE 2: Choose the Right Sanitizer
```typescript
// For names, descriptions → use text()
const cleanName = sanitize.text(name);

// For emails → use email()
const cleanEmail = sanitize.email(email);

// For URLs → use url()
const cleanLink = sanitize.url(url);

// For rich text (if needed) → use html()
const cleanBio = sanitize.html(bio);
```

### RULE 3: Never Trust API Data
Even data from YOUR backend should be sanitized when:
- Users can edit it
- It might be displayed to other users
- It came from user uploads

```typescript
// ✅ GOOD - sanitize API response
const { data: userList } = await userService.getAll();
const cleanNames = userList.map(u => sanitize.text(u.name));
```

### RULE 4: Use SafeText for Dynamic Rendering
```typescript
// ✅ BEST PRACTICE
function TransactionRow({ transaction }) {
  return (
    <div>
      <SafeText as="p">{transaction.description}</SafeText>
    </div>
  );
}
```

## Testing XSS Payloads

Test your components with these common XSS payloads:
```
<img src=x onerror="alert(1)">
<svg onload="alert(1)">
<iframe src="javascript:alert(1)">
<body onload="alert(1)">
<input onfocus="alert(1)">
<script>alert(1)</script>
javascript:alert(1)
<style>@import'http://attacker.com/x.css';</style>
```

All should be safely neutralized by the sanitize functions.

## Configuration

### Default Allowed Tags
The `sanitize.html()` function allows these tags:
- `<b>`, `<i>`, `<u>`, `<em>`, `<strong>` - formatting
- `<p>` - paragraphs
- `<br>` - line breaks

### Custom Configuration
To allow additional tags:
```typescript
import { sanitize } from '@/utils/sanitize';

const cleanHtml = sanitize.html(userHtml, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'a'],
  ALLOWED_ATTR: { 'a': ['href', 'title'] }
});
```

## CSP Headers (Backend Enforced)
The backend enforces Content Security Policy headers:
```
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
```

This prevents inline scripts from executing even if XSS injection succeeds.

## Common Mistakes

### ❌ MISTAKE 1: Sanitizing After Display
```typescript
// WRONG - sanitizing server output in template
<p>{sanitize.text(user.name)}</p> // Defeats server-side escaping

// RIGHT - trust server escaping for own data
<p>{user.name}</p>
```

### ❌ MISTAKE 2: Double Escaping
```typescript
// WRONG
<p>{escapeHtml(sanitize.text(input))}</p>

// RIGHT
<p>{sanitize.text(input)}</p>
```

### ❌ MISTAKE 3: Sanitizing Too Late
```typescript
// WRONG - stores unsanitized data
const htmlContent = richTextInput; // stored unsanitized
// ...later
<SafeHtml html={htmlContent} />

// RIGHT - sanitize on input
const htmlContent = sanitize.html(richTextInput);
setFormData({ ...formData, htmlContent });
```

## Monitoring & Logging

XSS attempts are logged via Helmet CSP violations on the backend. Check server logs for:
```
CSP violation: Attempted inline script execution
CSP violation: Attempted external script load
```

These indicate potential XSS attacks in real-time.

## References
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
