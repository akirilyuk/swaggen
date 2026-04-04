import type { LandingExampleOperation } from '@/data/landingExamples';

export function methodBadgeClass(
  method: LandingExampleOperation['method'],
): string {
  switch (method) {
    case 'GET':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'POST':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'PUT':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'PATCH':
      return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
    case 'DELETE':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
  }
}
