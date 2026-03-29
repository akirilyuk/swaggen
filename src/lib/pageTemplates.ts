import { v4 as uuidV4 } from 'uuid';

import type { UIComponent, UIPage } from '@/types/project';

/** Helper to create a component with sensible defaults. */
function comp(
  template: UIComponent['template'],
  title: string,
  overrides: Partial<UIComponent> = {},
): UIComponent {
  return {
    id: uuidV4(),
    template,
    title,
    entityId: null,
    relationId: null,
    slot: '6-col',
    order: 0,
    position: { x: 0, y: 0 },
    size: { width: 300, height: 120 },
    visibleFields: [],
    props: {},
    ...overrides,
  };
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Builds a UIPage from the template with fresh IDs. */
  build: () => UIPage;
}

/* ------------------------------------------------------------------ */
/*  Templates                                                          */
/* ------------------------------------------------------------------ */

const crudListPage: PageTemplate = {
  id: 'crud-list',
  name: 'CRUD List',
  description:
    'A data table with search, create button, and a response view for feedback.',
  icon: '📋',
  build: () => {
    const responseView = comp('response-view', 'Response', {
      position: { x: 640, y: 0 },
      size: { width: 340, height: 200 },
      props: { defaultTitle: 'API Response' },
    });

    const submitBtn = comp('button', 'Create', {
      position: { x: 340, y: 260 },
      size: { width: 260, height: 60 },
      props: { actionType: 'http', variant: 'primary', fullWidth: true },
      submitAction: {
        method: 'POST',
        url: '',
        payloadFormat: 'json',
        responseViewId: responseView.id,
      },
    });

    responseView.linkedSubmitButtonId = submitBtn.id;

    return {
      id: uuidV4(),
      name: 'List',
      path: '/list',
      description: 'Browse, search, and create records.',
      components: [
        comp('header-text', 'Records', {
          position: { x: 20, y: 20 },
          size: { width: 600, height: 60 },
          props: { headingSize: 'h1' },
        }),
        comp('list-table', 'All Records', {
          position: { x: 20, y: 100 },
          size: { width: 600, height: 300 },
          props: { striped: true, pageSize: '10' },
        }),
        comp('text-input', 'Name', {
          position: { x: 20, y: 420 },
          size: { width: 280, height: 80 },
        }),
        comp('text-input', 'Email', {
          position: { x: 340, y: 420 },
          size: { width: 280, height: 80 },
        }),
        {
          ...submitBtn,
          position: { x: 20, y: 520 },
          size: { width: 600, height: 60 },
        },
        {
          ...responseView,
          position: { x: 640, y: 100 },
          size: { width: 340, height: 320 },
        },
      ].map((c, i) => ({ ...c, order: i })),
    };
  },
};

const createFormPage: PageTemplate = {
  id: 'create-form',
  name: 'Create Form',
  description:
    'A clean form page with input fields, a submit button, and a response area.',
  icon: '✏️',
  build: () => {
    const responseView = comp('response-view', 'Result', {
      position: { x: 20, y: 500 },
      size: { width: 600, height: 200 },
      props: { defaultTitle: 'Submission Result' },
    });

    const submitBtn = comp('button', 'Submit', {
      position: { x: 20, y: 420 },
      size: { width: 600, height: 60 },
      props: { actionType: 'http', variant: 'primary', fullWidth: true },
      submitAction: {
        method: 'POST',
        url: '',
        payloadFormat: 'json',
        responseViewId: responseView.id,
      },
    });

    responseView.linkedSubmitButtonId = submitBtn.id;

    return {
      id: uuidV4(),
      name: 'Create',
      path: '/create',
      description: 'Create a new record with a form.',
      components: [
        comp('header-text', 'Create New Record', {
          position: { x: 20, y: 20 },
          size: { width: 600, height: 50 },
          props: { headingSize: 'h2' },
        }),
        comp('text-input', 'Name', {
          position: { x: 20, y: 90 },
          size: { width: 280, height: 80 },
        }),
        comp('text-input', 'Email', {
          position: { x: 340, y: 90 },
          size: { width: 280, height: 80 },
        }),
        comp('number-input', 'Age', {
          position: { x: 20, y: 190 },
          size: { width: 280, height: 80 },
        }),
        comp('select-dropdown', 'Role', {
          position: { x: 340, y: 190 },
          size: { width: 280, height: 80 },
        }),
        comp('text-area', 'Notes', {
          position: { x: 20, y: 290 },
          size: { width: 600, height: 110 },
          props: { rows: 3 },
        }),
        { ...submitBtn, order: 6 },
        { ...responseView, order: 7 },
      ].map((c, i) => ({ ...c, order: i })),
    };
  },
};

const detailPage: PageTemplate = {
  id: 'detail-view',
  name: 'Detail View',
  description:
    'Single-record screen: back link, headline, read-only field grid, related items, edit + delete, and a response panel for API feedback.',
  icon: '📄',
  build: () => {
    const responseView = comp('response-view', 'API response', {
      position: { x: 64, y: 884 },
      size: { width: 1792, height: 172 },
      props: { defaultTitle: 'API response' },
    });
    const deleteBtn = comp('button', 'Delete record', {
      position: { x: 284, y: 804 },
      size: { width: 240, height: 56 },
      props: {
        variant: 'danger',
        fullWidth: false,
        actionType: 'http',
        confirmationText:
          'Delete this record permanently? This cannot be undone.',
      },
      submitAction: {
        method: 'DELETE',
        url: '',
        payloadFormat: 'json',
        responseViewId: responseView.id,
      },
    });
    responseView.linkedSubmitButtonId = deleteBtn.id;

    return {
      id: uuidV4(),
      name: 'Detail',
      path: '/detail/[id]',
      description:
        'View one record: fields, related data, and destructive actions.',
      components: [
        comp('link', '← Back to list', {
          position: { x: 64, y: 48 },
          size: { width: 240, height: 40 },
          props: { url: '/list', target: '_self', variant: 'subtle' },
        }),
        comp('header-text', 'Record details', {
          position: { x: 64, y: 100 },
          size: { width: 1792, height: 72 },
          props: { headingSize: 'h1' },
        }),
        comp('paragraph', 'Bind an entity to this page, then add fields to the detail card. Use the response panel for delete or update API output.', {
          position: { x: 64, y: 184 },
          size: { width: 1120, height: 56 },
          props: { align: 'left', size: 'sm' },
        }),
        comp('detail-card', 'Record fields', {
          position: { x: 64, y: 256 },
          size: { width: 1152, height: 520 },
          props: { columns: '2' },
        }),
        comp('relation', 'Related items', {
          position: { x: 1248, y: 256 },
          size: { width: 608, height: 520 },
          props: { displayMode: 'list' },
        }),
        comp('button', 'Edit record', {
          position: { x: 64, y: 804 },
          size: { width: 200, height: 52 },
          props: { variant: 'outline', actionType: 'none', fullWidth: false },
        }),
        deleteBtn,
        responseView,
      ].map((c, i) => ({ ...c, order: i })),
    };
  },
};

const dashboardPage: PageTemplate = {
  id: 'dashboard',
  name: 'Dashboard',
  description:
    'An overview page with stat cards, a data table, and a quick-action button.',
  icon: '📊',
  build: () => ({
    id: uuidV4(),
    name: 'Dashboard',
    path: '/dashboard',
    description: 'Overview dashboard with key metrics.',
    components: [
      comp('header-text', 'Dashboard', {
        position: { x: 20, y: 20 },
        size: { width: 800, height: 50 },
        props: { headingSize: 'h1' },
      }),
      comp('stat-card', 'Total Users', {
        position: { x: 20, y: 90 },
        size: { width: 180, height: 120 },
        props: { colorTheme: 'blue', statPrefix: '' },
      }),
      comp('stat-card', 'Revenue', {
        position: { x: 220, y: 90 },
        size: { width: 180, height: 120 },
        props: { colorTheme: 'green', statPrefix: '' },
      }),
      comp('stat-card', 'Active Sessions', {
        position: { x: 420, y: 90 },
        size: { width: 180, height: 120 },
        props: { colorTheme: 'amber' },
      }),
      comp('stat-card', 'Error Rate', {
        position: { x: 620, y: 90 },
        size: { width: 180, height: 120 },
        props: { colorTheme: 'red', statSuffix: '%' },
      }),
      comp('list-table', 'Recent Activity', {
        position: { x: 20, y: 240 },
        size: { width: 780, height: 280 },
        props: { striped: true, compact: true, pageSize: '5' },
      }),
      comp('button', 'Export Report', {
        position: { x: 20, y: 540 },
        size: { width: 200, height: 50 },
        props: { variant: 'outline', actionType: 'none' },
      }),
    ].map((c, i) => ({ ...c, order: i })),
  }),
};

const landingPage: PageTemplate = {
  id: 'landing',
  name: 'Landing Page',
  description:
    'A simple landing page with a hero heading, text, and a CTA button.',
  icon: '🏠',
  build: () => ({
    id: uuidV4(),
    name: 'Home',
    path: '/',
    description: 'Landing page.',
    components: [
      comp('header-text', 'Welcome to Your App', {
        position: { x: 20, y: 40 },
        size: { width: 700, height: 70 },
        props: { headingSize: 'h1', textAlign: 'center' },
      }),
      comp('paragraph', 'Build powerful APIs and frontends in minutes.', {
        position: { x: 20, y: 130 },
        size: { width: 700, height: 60 },
        props: { textAlign: 'center', textColor: 'zinc' },
      }),
      comp('button', 'Get Started', {
        position: { x: 250, y: 210 },
        size: { width: 240, height: 60 },
        props: { variant: 'primary', size: 'lg', actionType: 'none' },
      }),
      comp('divider', '', {
        position: { x: 20, y: 300 },
        size: { width: 700, height: 20 },
      }),
      comp('header-text', 'Features', {
        position: { x: 20, y: 340 },
        size: { width: 700, height: 50 },
        props: { headingSize: 'h2', textAlign: 'center' },
      }),
      comp('card', 'Fast', {
        position: { x: 20, y: 410 },
        size: { width: 220, height: 120 },
      }),
      comp('card', 'Flexible', {
        position: { x: 260, y: 410 },
        size: { width: 220, height: 120 },
      }),
      comp('card', 'Secure', {
        position: { x: 500, y: 410 },
        size: { width: 220, height: 120 },
      }),
    ].map((c, i) => ({ ...c, order: i })),
  }),
};

const apiTestPage: PageTemplate = {
  id: 'api-test',
  name: 'API Tester',
  description:
    'A page to manually test API endpoints with method, URL, body, and response view.',
  icon: '🧪',
  build: () => {
    const responseView = comp('response-view', 'Response', {
      position: { x: 20, y: 420 },
      size: { width: 700, height: 300 },
      props: { defaultTitle: 'API Response' },
    });

    const sendBtn = comp('button', 'Send Request', {
      position: { x: 20, y: 340 },
      size: { width: 700, height: 55 },
      props: { actionType: 'http', variant: 'primary', fullWidth: true },
      submitAction: {
        method: 'GET',
        url: '',
        payloadFormat: 'json',
        responseViewId: responseView.id,
      },
    });

    responseView.linkedSubmitButtonId = sendBtn.id;

    return {
      id: uuidV4(),
      name: 'API Tester',
      path: '/api-test',
      description: 'Test API endpoints interactively.',
      components: [
        comp('header-text', 'API Tester', {
          position: { x: 20, y: 20 },
          size: { width: 700, height: 50 },
          props: { headingSize: 'h2' },
        }),
        comp('text-input', 'URL', {
          position: { x: 20, y: 90 },
          size: { width: 700, height: 80 },
          props: { placeholder: 'https://api.example.com/endpoint' },
        }),
        comp('text-area', 'Request Body', {
          position: { x: 20, y: 190 },
          size: { width: 700, height: 130 },
          props: { rows: 5, placeholder: '{ "key": "value" }' },
        }),
        { ...sendBtn, order: 3 },
        { ...responseView, order: 4 },
      ].map((c, i) => ({ ...c, order: i })),
    };
  },
};

/** All available page templates. */
export const PAGE_TEMPLATES: PageTemplate[] = [
  dashboardPage,
  crudListPage,
  createFormPage,
  detailPage,
  landingPage,
  apiTestPage,
];
