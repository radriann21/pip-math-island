import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ROUTER_HOOKS = [
  'useNavigate',
  'useParams',
  'useLocation',
  'useSearchParams',
  'useMatch',
  'useOutlet',
  'useOutletContext',
  'useRoutes',
  'useHref',
  'useLinkClickHandler',
];

const forbid = (...groups) => ({
  'no-restricted-imports': [
    'error',
    { patterns: groups.map(([group, message]) => ({ group, message })) },
  ],
});

// Matches both alias (`@/layer/...`) and relative (`../layer/...`) imports.
const layer = (name) => [`@/${name}`, `@/${name}/**`, `**/${name}`, `**/${name}/**`];
const frameworks = ['react', 'react/*', 'react-dom', 'react-dom/*', 'react-router-dom', '@supabase/*'];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'prototype', 'coverage', 'supabase'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  // domain: pure. No other layer, no React, no Supabase.
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: forbid(
      [layer('application'), 'domain must not depend on application.'],
      [layer('infrastructure'), 'domain must not depend on infrastructure.'],
      [layer('presentation'), 'domain must not depend on presentation.'],
      [layer('app'), 'domain must not depend on app.'],
      [frameworks, 'domain must not depend on React, the router or Supabase.'],
    ),
  },
  // application: only domain.
  {
    files: ['src/application/**/*.{ts,tsx}'],
    rules: forbid(
      [layer('infrastructure'), 'application must not depend on infrastructure.'],
      [layer('presentation'), 'application must not depend on presentation.'],
      [layer('app'), 'application must not depend on app.'],
      [frameworks, 'application must not depend on React, the router or Supabase.'],
    ),
  },
  // infrastructure: implements ports; no UI, no composition root.
  {
    files: ['src/infrastructure/**/*.{ts,tsx}'],
    rules: forbid(
      [layer('presentation'), 'infrastructure must not depend on presentation.'],
      [layer('app'), 'infrastructure must not depend on app.'],
    ),
  },
  // presentation: never touches adapters directly.
  {
    files: ['src/presentation/**/*.{ts,tsx}'],
    rules: forbid([layer('infrastructure'), 'presentation must not depend on infrastructure.']),
  },
  // presentational components: pure, no router hooks.
  {
    files: ['src/presentation/{atoms,molecules,organisms,templates}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: layer('infrastructure'), message: 'presentational components must not depend on infrastructure.' },
            { group: layer('application'), message: 'presentational components must not depend on application.' },
            { group: layer('app'), message: 'presentational components must not depend on app.' },
          ],
          paths: [
            {
              name: 'react-router-dom',
              importNames: ROUTER_HOOKS,
              message: 'presentational components must not use router hooks; use pages/containers.',
            },
          ],
        },
      ],
    },
  },
);
