import type { UIPage } from '@/types/project';

/** Non-empty Swaggen canvas artboard (layers). */
export function pageHasSwaggenCanvas(page: UIPage): boolean {
  return Boolean(page.swaggenDocument && page.swaggenDocument.elements.length > 0);
}

/** Interactive widgets on the Swaggen canvas or legacy free-form components. */
export function pageHasInteractiveComponents(page: UIPage): boolean {
  if ((page.components?.length ?? 0) > 0) return true;
  return Boolean(
    page.swaggenDocument?.elements.some(
      e =>
        e.kind === 'widget' ||
        Boolean(e.dataBinding?.entityId) ||
        Boolean(e.widget?.entityId),
    ),
  );
}

/**
 * @deprecated Prefer `pageHasSwaggenCanvas` / `pageHasInteractiveComponents`.
 * Single-mode hint for badges: which “primary” surface exists first.
 */
export function getPublicPageRenderMode(
  page: UIPage,
): 'swaggen' | 'freeform' | 'empty' {
  if (pageHasSwaggenCanvas(page)) return 'swaggen';
  if (pageHasInteractiveComponents(page)) return 'freeform';
  if (page.swaggenDocument && page.editorMode === 'swaggen') return 'swaggen';
  return 'empty';
}
