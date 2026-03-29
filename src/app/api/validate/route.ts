/**
 * POST /api/validate
 *
 * Validates an OpenAPI spec and returns parse results.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { spec } = (await req.json()) as { spec: unknown };

    if (!spec || typeof spec !== 'object') {
      return NextResponse.json(
        { valid: false, error: 'Missing or invalid spec' },
        { status: 400 },
      );
    }

    const doc = spec as Record<string, unknown>;

    // Basic structural validation
    const errors: string[] = [];

    if (!doc.openapi) errors.push('Missing "openapi" version field');
    if (!doc.info) errors.push('Missing "info" object');
    if (!doc.paths) errors.push('Missing "paths" object');

    if (doc.openapi && typeof doc.openapi === 'string') {
      if (!doc.openapi.startsWith('3.')) {
        errors.push(`Unsupported OpenAPI version: ${doc.openapi}`);
      }
    }

    const paths = (doc.paths ?? {}) as Record<string, unknown>;
    const schemas = ((doc.components as Record<string, unknown>)?.schemas ??
      {}) as Record<string, unknown>;

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
      stats: {
        paths: Object.keys(paths).length,
        schemas: Object.keys(schemas).length,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { valid: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
