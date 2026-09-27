/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-must-not-depend-on-other-layers',
      comment:
        'O domínio é a camada mais interna: não pode depender de application, ' +
        'infrastructure, presentation, platform ou main.',
      severity: 'error',
      from: { path: '^src/contexts/[^/]+/domain/' },
      to: {
        path: '^src/',
        pathNot: '^src/contexts/[^/]+/domain/',
      },
    },
    {
      name: 'application-must-not-depend-on-infrastructure-or-presentation',
      comment: 'A aplicação depende de capacidades (ports), não de implementações ou adapters.',
      severity: 'error',
      from: { path: '^src/contexts/[^/]+/application/' },
      to: { path: '^src/contexts/[^/]+/(infrastructure|presentation)/' },
    },
    {
      name: 'infrastructure-must-not-depend-on-presentation',
      comment: 'Infraestrutura implementa ports e não conhece a camada de transporte.',
      severity: 'error',
      from: { path: '^src/contexts/[^/]+/infrastructure/' },
      to: { path: '^src/contexts/[^/]+/presentation/' },
    },
    {
      name: 'presentation-must-not-depend-on-infrastructure',
      comment: 'Controllers e consumers chamam use cases; nunca acessam o banco/FFmpeg direto.',
      severity: 'error',
      from: { path: '^src/contexts/[^/]+/presentation/' },
      to: { path: '^src/contexts/[^/]+/infrastructure/' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg'],
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
