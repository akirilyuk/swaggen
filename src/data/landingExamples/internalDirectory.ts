import type { LandingExample } from './types';

export const internalDirectoryExample: LandingExample = {
  id: 'internal',
  title: 'Internal directory',
  tagline:
    'Employees, departments, and audit logs — enterprise CRUD with traceability.',
  category: 'Enterprise',
  entities: [
    {
      name: 'Department',
      fields: [{ name: 'code', type: 'string' }],
    },
    {
      name: 'Employee',
      fields: [
        { name: 'email', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'startedOn', type: 'date' },
      ],
    },
    {
      name: 'AuditLog',
      fields: [
        { name: 'action', type: 'string' },
        { name: 'actorId', type: 'uuid' },
        { name: 'at', type: 'date' },
      ],
    },
  ],
  relations: [
    { from: 'Department', label: '1 — N', to: 'Employee' },
    { from: 'Employee', label: '1 — N', to: 'AuditLog' },
  ],
  operations: [
    {
      method: 'GET',
      path: '/employees',
      summary: 'Directory search',
    },
    {
      method: 'PATCH',
      path: '/employees/{id}/department',
      summary: 'Transfer',
    },
    {
      method: 'GET',
      path: '/audit',
      summary: 'Compliance export',
    },
  ],
  snippetTitle: 'Entity field matrix (conceptual)',
  snippet: `Employee
  email          string   required
  departmentId   uuid     required  → Department
  managerId      uuid     optional  → Employee (self)

AuditLog
  targetType     enum(employee|department)
  targetId       uuid
  diff           json`,
};
