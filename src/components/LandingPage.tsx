'use client';

import {
  ArrowRight,
  Bot,
  Box,
  Braces,
  CheckCircle2,
  Code,
  Database,
  FolderOpen,
  Globe,
  Layers,
  Layout,
  LayoutDashboard,
  Link2,
  Sparkles,
  Workflow,
} from 'lucide-react';
import Link from 'next/link';

const WORKFLOW_STEPS = [
  {
    step: '1',
    title: 'Model your domain',
    description:
      'Define entities with typed fields, enums, and defaults. Wire up one-to-one, one-to-many, and many-to-many relations.',
  },
  {
    step: '2',
    title: 'Design the API surface',
    description:
      'Map HTTP operations to entities in the service designer, refine paths, and keep the OpenAPI spec in sync — edit JSON in Monaco or regenerate from your models.',
  },
  {
    step: '3',
    title: 'Extend with logic',
    description:
      'Author TypeScript middleware for auth, logging, and rate limits. Compose pipelines with bots (OpenAI, Claude, Ollama), transforms, and reusable chains.',
  },
  {
    step: '4',
    title: 'Generate & ship',
    description:
      'Choose storage (Supabase, MongoDB, MySQL, PostgreSQL, Redis, SQLite) with sample client snippets. Export Next.js App Router handlers, interfaces, and Zod schemas.',
  },
];

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Projects & persistence',
    description:
      'Create and switch between multiple API projects. State syncs with Supabase so your specs and designer data stay available across sessions.',
  },
  {
    icon: Box,
    title: 'Entity builder',
    description:
      'Visual model designer for Users, Orders, and any domain object — field types, constraints, and defaults without writing SQL by hand.',
  },
  {
    icon: Link2,
    title: 'Relation editor',
    description:
      'Connect entities with cardinality you expect from a real ORM: one-to-one, one-to-many, and many-to-many, all reflected in the generated spec.',
  },
  {
    icon: Layers,
    title: 'Middleware studio',
    description:
      'Write custom TypeScript middleware in a built-in Monaco editor — compose ordered chains for cross-cutting concerns before handlers run.',
  },
  {
    icon: Workflow,
    title: 'Service designer',
    description:
      'Group operations into logical services and map methods and routes to entities so your REST surface matches how you think about the product.',
  },
  {
    icon: Globe,
    title: 'API paths',
    description:
      'Curate and inspect route paths alongside your OpenAPI document so every endpoint stays traceable from spec to implementation.',
  },
  {
    icon: Bot,
    title: 'AI pipelines',
    description:
      'Chain bots, middleware runs, transforms, filters, and scripts into reusable pipelines for automation, enrichment, and testing workflows.',
  },
  {
    icon: Layout,
    title: 'Visual pages',
    description:
      'Drag-and-drop UI pages tied to your data model — prototype admin-style screens and previews without leaving the platform.',
  },
  {
    icon: Code,
    title: 'OpenAPI spec editor',
    description:
      'Full JSON editor with live validation, plus one-click regeneration from entities when you want the spec to follow the visual model.',
  },
  {
    icon: Braces,
    title: 'Server-side validation',
    description:
      'Built-in validate endpoint checks your document as you iterate so broken specs never make it to codegen.',
  },
  {
    icon: Database,
    title: 'Data storage',
    description:
      'First-class configuration for Supabase, MongoDB, MySQL, PostgreSQL, Redis, and SQLite — plus starter code for connecting clients.',
  },
  {
    icon: FolderOpen,
    title: 'Code generator',
    description:
      'Produce typed Next.js route handlers, TypeScript interfaces, and Zod validation from the spec you designed — ready to drop into a repo.',
  },
];

const TECH_STACK = [
  'Next.js 16 · App Router',
  'React 19',
  'Tailwind CSS 4',
  'Zustand',
  'Monaco Editor',
  'Supabase',
];

/** Landing page shown to unauthenticated visitors. */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-5 sm:px-8">
        <span className="text-xl font-bold tracking-tight text-white">
          Swaggen<span className="text-blue-600">Next</span>
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white sm:px-4"
          >
            Sign In
          </Link>
          <Link
            href="/login?mode=signup"
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 sm:px-4"
          >
            Get Started
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-4xl px-6 py-20 text-center sm:px-8 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          aria-hidden
        >
          <div className="absolute left-1/2 top-0 h-64 w-[min(100%,40rem)] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
        </div>
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-blue-400">
          Visual API platform
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
          Build APIs <span className="text-blue-500">without code</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          SwaggenNext is a visual builder for OpenAPI-backed APIs: model data,
          configure middleware and services, wire AI pipelines and UI pages, then
          generate production-ready Next.js route handlers — powered by the
          Swaggen code generator.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-blue-700"
          >
            Start building <ArrowRight size={16} aria-hidden />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            Sign In
          </Link>
        </div>
      </section>

      <section className="border-y border-zinc-800/80 bg-zinc-900/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              From whiteboard to OpenAPI
            </h2>
            <p className="mt-3 text-zinc-400">
              Follow the same workflow teams use in the app — design first,
              then let the tooling emit spec and code.
            </p>
          </div>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW_STEPS.map(({ step, title, description }) => (
              <li
                key={step}
                className="relative rounded-xl border border-zinc-800 bg-zinc-950/80 p-6"
              >
                <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/15 text-sm font-bold text-blue-400">
                  {step}
                </span>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-24">
        <h2 className="mb-4 text-center text-3xl font-bold text-white">
          Everything you need to build APIs fast
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-zinc-400">
          Every sidebar destination maps to a real capability — not a
          placeholder. Use what you need today; the rest stays one click away.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 transition-colors hover:border-zinc-700"
            >
              <div className="mb-4 inline-flex rounded-lg bg-blue-600/10 p-2.5 text-blue-500">
                <Icon size={22} aria-hidden />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-zinc-900/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 text-blue-400">
                <Sparkles size={18} aria-hidden />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Built for developers
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Modern stack, no lock-in
              </h2>
              <p className="mt-3 text-zinc-400">
                SwaggenNext runs on the same technologies you already deploy:
                standard OpenAPI, TypeScript, and Next.js App Router patterns.
                Generated code is yours to commit, review, and extend.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 shrink-0 text-emerald-500"
                    size={16}
                    aria-hidden
                  />
                  <span>
                    Lucide icons, accessible UI primitives, and dark-first
                    chrome tuned for long design sessions.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 shrink-0 text-emerald-500"
                    size={16}
                    aria-hidden
                  />
                  <span>
                    Shareable static previews for published projects under{' '}
                    <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">
                      /site/…
                    </code>{' '}
                    when you want read-only demos without a login wall.
                  </span>
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
              {TECH_STACK.map(label => (
                <span
                  key={label}
                  className="rounded-full border border-zinc-700 bg-zinc-950/80 px-4 py-2 text-xs font-medium text-zinc-300"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center sm:px-8 sm:py-20">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Ready to design your next API?
        </h2>
        <p className="mt-3 text-zinc-400">
          Create a free account, spin up a project, and go from entities to
          generated route handlers in one sitting.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-blue-700"
          >
            Create free account <ArrowRight size={16} aria-hidden />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            Sign In
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-xs text-zinc-500 sm:px-8">
        SwaggenNext v0.1.0 — Visual API Builder
      </footer>
    </div>
  );
}
