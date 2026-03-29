import { notFound } from 'next/navigation';

import { PublicSitePageView } from '@/components/site/PublicSitePageView';
import { getProject } from '@/lib/projectRegistry';
import { pathFromSegments, pathsMatch } from '@/lib/sitePagePath';

interface SitePageProps {
  params: Promise<{ slug: string; path?: string[] }>;
}

export default async function SitePage({ params }: SitePageProps) {
  const { slug, path: segments } = await params;
  const project = getProject(slug);
  if (!project) {
    notFound();
  }

  const urlPath = pathFromSegments(segments);
  const page = project.pages.find(p => pathsMatch(p.path, urlPath));
  if (!page) {
    notFound();
  }

  return (
    <PublicSitePageView
      projectName={project.name}
      page={page}
      entities={project.entities ?? []}
    />
  );
}
