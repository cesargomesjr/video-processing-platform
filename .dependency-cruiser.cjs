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
    {
      name: 'identity-context-must-not-depend-on-other-contexts',
      comment:
        'Contextos se integram por portas/eventos e pelo composition root, não por imports diretos.',
      severity: 'error',
      from: { path: '^src/contexts/identity/' },
      to: { path: '^src/contexts/(notification|video-management|video-processing)/' },
    },
    {
      name: 'notification-context-must-not-depend-on-other-contexts',
      comment:
        'Contextos se integram por portas/eventos e pelo composition root, não por imports diretos.',
      severity: 'error',
      from: { path: '^src/contexts/notification/' },
      to: { path: '^src/contexts/(identity|video-management|video-processing)/' },
    },
    {
      name: 'video-management-context-must-not-depend-on-other-contexts',
      comment:
        'Contextos se integram por portas/eventos e pelo composition root, não por imports diretos.',
      severity: 'error',
      from: { path: '^src/contexts/video-management/' },
      to: { path: '^src/contexts/(identity|notification|video-processing)/' },
    },
    {
      name: 'video-processing-context-must-not-depend-on-other-contexts',
      comment:
        'Contextos se integram por portas/eventos e pelo composition root, não por imports diretos.',
      severity: 'error',
      from: { path: '^src/contexts/video-processing/' },
      to: { path: '^src/contexts/(identity|notification|video-management)/' },
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
