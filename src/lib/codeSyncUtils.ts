/**
 * Utilities for bidirectional sync between service code and the UI function list.
 * Uses lightweight regex-based parsing — no full AST.
 */
import type { ServiceMethod } from '@/types/project';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ParsedMethod {
  name: string;
  params: string;
  returnType: string;
  /** The second parameter type (the "body" type), if any. */
  inputType?: string;
  /** Extracted from return annotation comment or generic. */
  outputType?: string;
}

/* ------------------------------------------------------------------ */
/*  Code → UI: parse method signatures from class code                 */
/* ------------------------------------------------------------------ */

/**
 * Extract public async method signatures from a TypeScript class string.
 * Skips `healthCheck` since that's managed separately.
 * Uses bracket-depth counting to handle complex nested types.
 */
export function parseMethodsFromCode(code: string): ParsedMethod[] {
  const results: ParsedMethod[] = [];
  // Find each `async methodName(` occurrence
  const startRegex = /async\s+(\w+)\s*\(/g;
  let startMatch: RegExpExecArray | null;

  while ((startMatch = startRegex.exec(code)) !== null) {
    const name = startMatch[1];
    if (name === 'healthCheck' || name === 'constructor') continue;

    // Find matching `)` for the opening `(` using depth counting
    const openParenIdx = startMatch.index + startMatch[0].length - 1;
    const closeParenIdx = findClosing(code, openParenIdx, '(', ')');
    if (closeParenIdx === -1) continue;

    const params = code.slice(openParenIdx + 1, closeParenIdx).trim();

    // After `)`, look for optional `: ReturnType` then the opening `{` of the body
    const afterParen = code.slice(closeParenIdx + 1);
    const bodyOpenMatch = findBodyOpen(afterParen);
    if (!bodyOpenMatch) continue;

    const returnType = bodyOpenMatch.returnType.trim();

    const inputType = extractInputType(params);
    const outputType = extractOutputType(returnType);

    results.push({ name, params, returnType, inputType, outputType });
  }
  return results;
}

/**
 * Find the closing bracket matching the opener at `openIdx`.
 * Works for (), {}, <>.
 */
function findClosing(
  str: string,
  openIdx: number,
  openCh: string,
  closeCh: string,
): number {
  let depth = 0;
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === openCh) depth++;
    else if (str[i] === closeCh) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * After the closing `)` of a method signature, find the return type
 * annotation and the opening `{` of the body.
 * Handles nested braces in return types like `Promise<{some: string}>`.
 */
function findBodyOpen(
  afterParen: string,
): { returnType: string; bodyIdx: number } | null {
  let i = 0;
  // Skip whitespace
  while (i < afterParen.length && /\s/.test(afterParen[i])) i++;

  let returnType = '';

  // Check for `: ReturnType`
  if (afterParen[i] === ':') {
    i++; // skip `:`
    // Collect return type until we find a top-level `{` (the method body opener)
    let depth = 0;
    const start = i;
    while (i < afterParen.length) {
      const ch = afterParen[i];
      if (ch === '<' || ch === '(') depth++;
      else if (ch === '>' || ch === ')') depth--;
      else if (ch === '{') {
        if (depth === 0) {
          returnType = afterParen.slice(start, i);
          return { returnType, bodyIdx: i };
        }
        depth++;
      } else if (ch === '}') {
        depth--;
      }
      i++;
    }
  } else if (afterParen[i] === '{') {
    return { returnType: '', bodyIdx: i };
  }

  return null;
}

/**
 * Extract the input type from the function parameters.
 * Handles:
 *   - Named param with type:  `body: User`  →  `User`
 *   - Destructured object:    `{name: string}`  →  `{name: string}`
 *   - Typed destructured:     `{name}: User`  →  `User`
 * Skips params named `req`, `request`, `ctx`, `context` (infra params).
 */
function extractInputType(params: string): string | undefined {
  const trimmed = params.trim();
  if (!trimmed) return undefined;

  // If the whole param string starts with `{`, it's a destructured object literal used as the type
  if (trimmed.startsWith('{')) {
    // Could be `{name: string}` (inline object type) or `{name}: SomeType`
    // Find the matching closing brace
    const closingIdx = findMatchingBrace(trimmed, 0);
    if (closingIdx === -1) return trimmed; // malformed, return as-is

    const afterBrace = trimmed.slice(closingIdx + 1).trim();
    if (afterBrace.startsWith(':')) {
      // `{name}: SomeType` — the type annotation after destructuring
      return afterBrace.slice(1).trim() || undefined;
    }
    // `{name: string}` — the destructured object IS the type
    return trimmed.slice(0, closingIdx + 1);
  }

  // Split by top-level commas (not inside braces/angles)
  const parts = splitTopLevel(trimmed, ',');

  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;

    const colonIdx = p.indexOf(':');
    if (colonIdx === -1) continue;

    const paramName = p.slice(0, colonIdx).trim();
    const type = p.slice(colonIdx + 1).trim();

    // Skip infrastructure params
    if (/^(req|request|ctx|context|_req)$/i.test(paramName)) continue;
    // Skip NextRequest typed params
    if (type === 'NextRequest') continue;

    if (type && type !== 'unknown') return type;
  }

  return undefined;
}

/** Find the index of the matching closing brace for an opening `{` at `startIdx`. */
function findMatchingBrace(str: string, startIdx: number): number {
  let depth = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Split a string by a delimiter, but only at the top level (not inside `{}`, `<>`, `()`). */
function splitTopLevel(str: string, delimiter: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '{' || ch === '<' || ch === '(') depth++;
    else if (ch === '}' || ch === '>' || ch === ')') depth--;

    if (depth === 0 && str.slice(i, i + delimiter.length) === delimiter) {
      parts.push(current);
      current = '';
      i += delimiter.length - 1;
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/** Extract the output type from a return type annotation. */
function extractOutputType(returnType: string): string | undefined {
  // 1. Comment annotation takes priority: Promise<NextResponse> /* → User */
  const commentMatch = returnType.match(/\/\*\s*→\s*(.+?)\s*\*\//);
  if (commentMatch) return commentMatch[1].trim();

  const trimmed = returnType.trim();
  if (!trimmed || trimmed === 'void') return undefined;

  // 2. Check for Promise<void> or Promise<NextResponse> — skip those
  const promiseIdx = trimmed.search(/Promise\s*</);
  if (promiseIdx !== -1) {
    const openAngle = trimmed.indexOf('<', promiseIdx);
    if (openAngle !== -1) {
      const inner = extractBalanced(trimmed, openAngle, '<', '>');
      if (inner !== undefined) {
        const innerTrimmed = inner.trim();
        if (innerTrimmed === 'NextResponse' || innerTrimmed === 'void') {
          return undefined;
        }
      }
    }
    // Return the full type including Promise<>
    return trimmed;
  }

  // 3. Plain return type (non-Promise)
  if (trimmed !== 'NextResponse') return trimmed;

  return undefined;
}

/**
 * Extract the content between balanced open/close characters.
 * e.g. extractBalanced("Promise<{a: string}>", 7, '<', '>') → "{a: string}"
 */
function extractBalanced(
  str: string,
  openIdx: number,
  openCh: string,
  closeCh: string,
): string | undefined {
  let depth = 0;
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === openCh) depth++;
    else if (str[i] === closeCh) {
      depth--;
      if (depth === 0) return str.slice(openIdx + 1, i);
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  UI → Code: insert / remove / rename method stubs                   */
/* ------------------------------------------------------------------ */

/** Build a method stub string for insertion into a class body. */
function buildStub(
  methodName: string,
  inputType?: string,
  outputType?: string,
): string {
  const params = inputType ? `body: ${inputType}` : '';
  const retType = outputType ?? 'Promise<void>';

  return `  async ${methodName}(${params}): ${retType} {
    // TODO: implement ${methodName}
  }`;
}

/**
 * Insert a new method stub into a class-based service code string.
 * Places it just before the `healthCheck` method, or before the
 * closing brace of the class if `healthCheck` is not found.
 */
export function insertMethodStub(
  code: string,
  methodName: string,
  inputType?: string,
  outputType?: string,
): string {
  // Don't insert if a method with this name already exists
  const existsRegex = new RegExp(`async\\s+${escapeRegex(methodName)}\\s*\\(`);
  if (existsRegex.test(code)) return code;

  const stub = buildStub(methodName, inputType, outputType);

  // Try to insert before healthCheck
  const hcIndex = code.search(/\basync\s+healthCheck\s*\(/);
  if (hcIndex !== -1) {
    return code.slice(0, hcIndex) + stub + '\n\n' + code.slice(hcIndex);
  }

  // Fallback: insert before the last closing brace of the class
  const lastBrace = code.lastIndexOf('}');
  if (lastBrace !== -1) {
    const secondLastBrace = code.lastIndexOf('}', lastBrace - 1);
    if (secondLastBrace !== -1) {
      return (
        code.slice(0, secondLastBrace) +
        stub +
        '\n\n' +
        code.slice(secondLastBrace)
      );
    }
  }

  if (lastBrace !== -1) {
    return (
      code.slice(0, lastBrace) + '\n' + stub + '\n' + code.slice(lastBrace)
    );
  }

  return code + '\n' + stub;
}

/**
 * Remove a method from service code by name.
 * Uses brace-depth counting to find the full method block.
 */
export function removeMethodFromCode(code: string, methodName: string): string {
  // Find the start of the method: `async methodName(`
  const startRegex = new RegExp(
    `(\\n?[ \\t]*)async\\s+${escapeRegex(methodName)}\\s*\\(`,
  );
  const startMatch = startRegex.exec(code);
  if (!startMatch) return code;

  const blockStart = startMatch.index;

  // Find the opening `(` then skip past params `)` then past return type to body `{`
  const openParen = code.indexOf('(', blockStart + startMatch[0].length - 1);
  if (openParen === -1) return code;
  const closeParen = findClosing(code, openParen, '(', ')');
  if (closeParen === -1) return code;

  // Find the method body opening `{` after the closing `)` and optional return type
  const afterParen = code.slice(closeParen + 1);
  const bodyInfo = findBodyOpen(afterParen);
  if (!bodyInfo) return code;

  const braceStart = closeParen + 1 + bodyInfo.bodyIdx;
  const braceEnd = findClosing(code, braceStart, '{', '}');
  if (braceEnd === -1) return code;

  // Remove from blockStart to end of method, including trailing blank lines
  let end = braceEnd + 1;
  while (end < code.length && (code[end] === '\n' || code[end] === '\r')) {
    end++;
  }

  return code.slice(0, blockStart) + code.slice(end);
}

/**
 * Rename a method in code (preserving its body).
 */
export function renameMethodInCode(
  code: string,
  oldName: string,
  newName: string,
): string {
  if (!oldName || !newName || oldName === newName) return code;
  const regex = new RegExp(`(async\\s+)${escapeRegex(oldName)}(\\s*\\()`, 'g');
  return code.replace(regex, `$1${newName}$2`);
}

/**
 * Update a method's parameter/return types when types change.
 * Replaces the signature line while preserving the body.
 */
export function updateMethodSignature(
  code: string,
  methodName: string,
  inputType?: string,
  outputType?: string,
): string {
  // Find `async methodName(`
  const startRegex = new RegExp(
    `([ \\t]*)async\\s+${escapeRegex(methodName)}\\s*\\(`,
  );
  const startMatch = startRegex.exec(code);
  if (!startMatch) return code;

  const indent = startMatch[1];
  const sigStart = startMatch.index;

  // Find matching `)` for params
  const openParen = code.indexOf('(', sigStart + startMatch[0].length - 1);
  if (openParen === -1) return code;
  const closeParen = findClosing(code, openParen, '(', ')');
  if (closeParen === -1) return code;

  // Find the body opening `{` after `)` and optional return type
  const afterParen = code.slice(closeParen + 1);
  const bodyInfo = findBodyOpen(afterParen);
  if (!bodyInfo) return code;

  // The full signature spans from sigStart to (closeParen + 1 + bodyIdx + 1) exclusive of `{`
  const bodyBraceIdx = closeParen + 1 + bodyInfo.bodyIdx;

  const params = inputType ? `body: ${inputType}` : '';
  const retType = outputType ?? 'Promise<void>';
  const newSig = `${indent}async ${methodName}(${params}): ${retType} {`;

  return code.slice(0, sigStart) + newSig + code.slice(bodyBraceIdx + 1);
}

/* ------------------------------------------------------------------ */
/*  Reconciliation: merge code-parsed methods with UI methods          */
/* ------------------------------------------------------------------ */

/**
 * Merge parsed-from-code methods with existing UI methods.
 * Code is the source of truth — only methods found in code are returned.
 * UI metadata (description, etc.) is preserved for methods that exist in both.
 */
export function reconcileMethods(
  uiMethods: ServiceMethod[],
  parsedMethods: ParsedMethod[],
): ServiceMethod[] {
  const uiByName = new Map(uiMethods.map(m => [m.name, m]));
  const result: ServiceMethod[] = [];

  for (const pm of parsedMethods) {
    const existing = uiByName.get(pm.name);
    if (existing) {
      // Keep UI metadata (description) but always sync types from code
      result.push({
        ...existing,
        inputType: pm.inputType,
        outputType: pm.outputType,
      });
    } else {
      result.push({
        name: pm.name,
        description: '',
        inputType: pm.inputType,
        outputType: pm.outputType,
      });
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
