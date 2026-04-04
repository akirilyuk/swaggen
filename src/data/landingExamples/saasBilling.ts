import type { LandingExample } from './types';

export const saasBillingExample: LandingExample = {
  id: 'saas-billing',
  title: 'SaaS billing & tenants',
  tagline:
    'Multi-tenant subscriptions with invoices — typical B2B product backend.',
  category: 'SaaS',
  entities: [
    {
      name: 'Organization',
      fields: [
        { name: 'name', type: 'string' },
        { name: 'slug', type: 'string' },
        { name: 'planTier', type: 'enum' },
      ],
    },
    {
      name: 'Subscription',
      fields: [
        { name: 'status', type: 'enum' },
        { name: 'currentPeriodEnd', type: 'date' },
        { name: 'seats', type: 'number' },
      ],
    },
    {
      name: 'Invoice',
      fields: [
        { name: 'amountCents', type: 'number' },
        { name: 'currency', type: 'string' },
        { name: 'paidAt', type: 'date' },
      ],
    },
  ],
  relations: [
    { from: 'Organization', label: '1 — N', to: 'Subscription' },
    { from: 'Subscription', label: '1 — N', to: 'Invoice' },
  ],
  operations: [
    {
      method: 'GET',
      path: '/orgs/{orgId}/subscription',
      summary: 'Current plan and renewal',
    },
    {
      method: 'POST',
      path: '/orgs/{orgId}/invoices',
      summary: 'Create invoice draft',
    },
    {
      method: 'GET',
      path: '/invoices/{invoiceId}',
      summary: 'Fetch invoice PDF metadata',
    },
  ],
  snippetTitle: 'Generated Zod (excerpt)',
  snippet: `const Subscription = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: z.enum(['active', 'past_due', 'canceled']),
  currentPeriodEnd: z.string().datetime(),
  seats: z.number().int().min(1),
});`,
};
