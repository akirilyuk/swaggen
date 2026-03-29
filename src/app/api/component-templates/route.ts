/**
 * GET /api/component-templates — list all available component templates
 *
 * Returns the full registry of UI component templates that can be
 * placed on a page in the designer. Supports optional `group` query
 * parameter to filter by category.
 *
 * Examples:
 *   GET /api/component-templates           → all templates
 *   GET /api/component-templates?group=Form → only Form group
 */
import { NextRequest, NextResponse } from 'next/server';

import {
  COMPONENT_TEMPLATE_REGISTRY,
  TEMPLATE_GROUPS,
  getTemplatesByGroup,
} from '@/lib/componentTemplateRegistry';

export async function GET(req: NextRequest) {
  const group = req.nextUrl.searchParams.get('group');

  if (group) {
    const templates = getTemplatesByGroup(group);
    if (templates.length === 0) {
      return NextResponse.json(
        {
          error: `Unknown group: "${group}"`,
          availableGroups: TEMPLATE_GROUPS,
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ group, templates });
  }

  // Group templates by category for the full response
  const grouped = TEMPLATE_GROUPS.reduce((acc, g) => {
    acc[g] = getTemplatesByGroup(g);
    return acc;
  }, {} as Record<string, typeof COMPONENT_TEMPLATE_REGISTRY>);

  return NextResponse.json({
    groups: TEMPLATE_GROUPS,
    templates: COMPONENT_TEMPLATE_REGISTRY,
    grouped,
  });
}
