export interface ParsedEmail {
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
}

export function parseEml(emlContent: string): ParsedEmail {
  // 1. Split headers and body
  // The headers are separated from the body by the first double newline (\n\n or \r\n\r\n).
  const doubleNewlineIndex = emlContent.search(/\r?\n\r?\n/);
  let headersPart = '';
  let bodyPart = '';
  
  if (doubleNewlineIndex !== -1) {
    headersPart = emlContent.substring(0, doubleNewlineIndex);
    bodyPart = emlContent.substring(doubleNewlineIndex).trim();
  } else {
    headersPart = emlContent;
  }
  
  // 2. Parse headers
  // Unfold folded header lines: if a line starts with space or tab, append to previous line.
  const headerLines = headersPart.split(/\r?\n/);
  const unfoldedHeaders: string[] = [];
  for (const line of headerLines) {
    if (/^[ \t]/.test(line) && unfoldedHeaders.length > 0) {
      unfoldedHeaders[unfoldedHeaders.length - 1] += ' ' + line.trim();
    } else {
      unfoldedHeaders.push(line.trim());
    }
  }
  
  const headers: Record<string, string> = {};
  for (const line of unfoldedHeaders) {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim().toLowerCase();
      const val = line.substring(colonIndex + 1).trim();
      headers[key] = val;
    }
  }
  
  // Helper to decode RFC 2047 encoded words (e.g. =?UTF-8?B?...?= or =?UTF-8?Q?...?=)
  function decodeRFC2047(text: string): string {
    if (!text) return '';
    return text.replace(/=\?([^?]+)\?([QBqb])\?([^?]*)\?=/g, (match, charset, encoding, encodedText) => {
      try {
        if (encoding.toLowerCase() === 'b') {
          const buf = Buffer.from(encodedText, 'base64');
          return buf.toString(charset.toLowerCase() as BufferEncoding || 'utf-8');
        } else if (encoding.toLowerCase() === 'q') {
          // Quoted-printable in headers: spaces are represented by underscores
          const qText = encodedText.replace(/_/g, ' ');
          const hexDecoded = qText.replace(/=([0-9A-F]{2})/gi, (_: string, hex: string) => 
            String.fromCharCode(parseInt(hex, 16))
          );
          return Buffer.from(hexDecoded, 'binary').toString(charset.toLowerCase() as BufferEncoding || 'utf-8');
        }
      } catch (e) {
        console.error('Failed to decode RFC 2047 word:', match, e);
      }
      return match;
    });
  }
  
  const subject = decodeRFC2047(headers['subject'] || '');
  const from = decodeRFC2047(headers['from'] || '');
  const to = decodeRFC2047(headers['to'] || '');
  const dateStr = headers['date'] || '';
  
  // Format date nicely if possible
  let date = dateStr;
  try {
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      const day = parsedDate.getDate();
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const month = monthNames[parsedDate.getMonth()];
      const year = parsedDate.getFullYear();
      date = `${day} ${month} ${year}`;
    }
  } catch (e) {
    // Keep original string if date parsing fails
  }
  
  // 3. Parse body
  const contentType = headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^; \t]+))/i);
  let body = '';
  
  if (boundaryMatch) {
    const boundary = boundaryMatch[1] || boundaryMatch[2];
    body = parseMultipartBody(bodyPart, boundary, headers['content-transfer-encoding']);
  } else {
    body = decodeBodyPart(bodyPart, headers['content-transfer-encoding'], contentType);
  }
  
  return {
    subject: subject || 'No Subject',
    from: from || 'Unknown Sender',
    to: to || '',
    date: date || 'Unknown Date',
    body: body.trim()
  };
}

function decodeBodyPart(rawBody: string, transferEncoding: string | undefined, contentType: string | undefined): string {
  let decoded = rawBody;
  const encoding = (transferEncoding || '').toLowerCase().trim();
  
  if (encoding === 'base64') {
    const cleanB64 = rawBody.replace(/\s+/g, '');
    try {
      decoded = Buffer.from(cleanB64, 'base64').toString('utf-8');
    } catch (e) {
      console.error('Failed to decode base64 body:', e);
    }
  } else if (encoding === 'quoted-printable') {
    decoded = decodeQuotedPrintable(rawBody);
  }
  
  const isHtml = (contentType || '').toLowerCase().includes('text/html');
  if (isHtml) {
    decoded = stripHtml(decoded);
  }
  
  return decoded;
}

function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, '') // Remove soft line breaks
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => {
      try {
        return Buffer.from(hex, 'hex').toString('utf-8');
      } catch (e) {
        return String.fromCharCode(parseInt(hex, 16));
      }
    });
}

function stripHtml(html: string): string {
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n');
    
  text = text.replace(/<[^>]+>/g, '');
  
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
    
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');
  
  return text.trim();
}

function parseMultipartBody(bodyPart: string, boundary: string, globalTransferEncoding: string | undefined): string {
  const parts = bodyPart.split('--' + boundary);
  let textPart = '';
  let htmlPart = '';
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part === '' || part === '--') continue;
    
    const doubleNewlineIndex = part.search(/\r?\n\r?\n/);
    if (doubleNewlineIndex === -1) continue;
    
    const headersSection = part.substring(0, doubleNewlineIndex);
    const contentSection = part.substring(doubleNewlineIndex).trim();
    
    const partHeaders: Record<string, string> = {};
    headersSection.split(/\r?\n/).forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        partHeaders[key] = line.substring(colonIndex + 1).trim();
      }
    });
    
    const partContentType = partHeaders['content-type'] || '';
    const partTransferEncoding = partHeaders['content-transfer-encoding'] || globalTransferEncoding;
    
    if (partContentType.toLowerCase().includes('text/plain')) {
      textPart = decodeBodyPart(contentSection, partTransferEncoding, partContentType);
    } else if (partContentType.toLowerCase().includes('text/html') && !textPart) {
      htmlPart = decodeBodyPart(contentSection, partTransferEncoding, partContentType);
    } else if (partContentType.toLowerCase().includes('multipart/')) {
      const nestedBoundaryMatch = partContentType.match(/boundary=(?:"([^"]+)"|([^; \t]+))/i);
      if (nestedBoundaryMatch) {
        const nestedBoundary = nestedBoundaryMatch[1] || nestedBoundaryMatch[2];
        const nestedResult = parseMultipartBody(contentSection, nestedBoundary, partTransferEncoding);
        if (nestedResult) {
          textPart = nestedResult;
        }
      }
    }
  }
  
  return textPart || htmlPart || '';
}
