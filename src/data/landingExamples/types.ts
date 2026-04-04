/**
 * Shared shapes for static landing-page API blueprints.
 */

export interface LandingExampleEntity {
  name: string;
  fields: { name: string; type: string }[];
}

export interface LandingExampleRelation {
  from: string;
  label: string;
  to: string;
}

export interface LandingExampleOperation {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
}

export interface LandingExample {
  id: string;
  title: string;
  tagline: string;
  category: string;
  entities: LandingExampleEntity[];
  relations: LandingExampleRelation[];
  operations: LandingExampleOperation[];
  snippetTitle: string;
  snippet: string;
}
