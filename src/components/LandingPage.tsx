'use client';

import {
  Code,
  Database,
  Globe,
  Layers,
  Workflow,
  Zap,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const FEATURES = [
  {
    icon: Database,
    title: 'Visual Entity Builder',
    description:
      'Define your data models, fields, and relationships with an intuitive drag-and-drop interface — no SQL required.',
  },
  {
    icon: Globe,
    title: 'Auto-Generated API',
    description:
      'Instantly generate RESTful API routes from your OpenAPI spec, complete with validation and type safety.',
  },
  {
    icon: Layers,
    title: 'Middleware Pipeline',
    description:
      'Add authentication, logging, rate limiting, and custom middleware with a few clicks.',
  },
  {
    icon: Workflow,
    title: 'Service Orchestration',
    description:
      'Connect services, define business logic, and build automation pipelines visually.',
  },
  {
    icon: Code,
    title: 'Production-Ready Code',
    description:
      'Export clean, typed Next.js code you can deploy anywhere — no vendor lock-in.',
  },
  {
    icon: Zap,
    title: 'AI-Powered Pipelines',
    description:
      'Use AI bots to automate tasks like data transformation, content generation, and testing.',
  },
];

/** Landing page shown to unauthenticated visitors. */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <span className="text-xl font-bold tracking-tight text-white">
          Swaggen<span className="text-blue-600">Next</span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/login?mode=signup"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-8 py-24 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Build APIs <span className="text-blue-500">without code</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          SwaggenNext lets you design data models, configure middleware, and
          generate production-ready Next.js API routes — all from a visual
          editor. Ship faster, iterate sooner.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-blue-700"
          >
            Start Building <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-8 pb-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-white">
          Everything you need to build APIs fast
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-700"
            >
              <div className="mb-4 inline-flex rounded-lg bg-blue-600/10 p-2.5 text-blue-500">
                <Icon size={22} />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-8 py-6 text-center text-xs text-zinc-500">
        SwaggenNext v0.1.0 — Visual API Builder
      </footer>
    </div>
  );
}
