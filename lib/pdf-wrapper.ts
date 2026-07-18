/**
 * pdf-wrapper.ts
 *
 * pdf-parse is a CommonJS module. Every static import approach
 * (ESM default import, createRequire, dynamic import) gets intercepted
 * and transformed by Turbopack, producing a module namespace object
 * instead of the raw function.
 *
 * The ONLY reliable escape hatch is eval('require') — the bundler
 * cannot statically analyse it, so it passes through to native Node.js
 * require() which returns module.exports directly (the function itself).
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line no-eval
  const pdfParse: (buf: Buffer) => Promise<{ text: string }> = eval('require')('pdf-parse')
  const data = await pdfParse(buffer)
  return data.text
}
