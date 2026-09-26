/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'only-main-may-depend-on-main',
      severity: 'error',
      from: { path: '^apps/api/src/(contexts|platform)/' },
      to: { path: '^apps/api/src/main/' },
    },
    {
      name: 'domain-must-not-depend-on-external-packages',
      severity: 'error',
      from: { path: '/domain/' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer'] },
    },
    {
      name: 'application-must-not-depend-on-external-packages',
      severity: 'error',
      from: { path: '/application/' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer'] },
    },
    {
      name: 'domain-must-not-depend-on-outer-layers',
      severity: 'error',
      from: { path: '/domain/' },
      to: { path: '/(application|infrastructure|presentation|main|platform)/' },
    },
    {
      name: 'application-must-not-depend-on-outer-layers',
      severity: 'error',
      from: { path: '/application/' },
      to: { path: '/(infrastructure|presentation|main)/' },
    },
    {
      name: 'presentation-must-not-depend-on-infrastructure-or-main',
      severity: 'error',
      from: { path: '/presentation/' },
      to: { path: '/(infrastructure|main)/' },
    },
    {
      name: 'infrastructure-must-not-depend-on-presentation-or-main',
      severity: 'error',
      from: { path: '/infrastructure/' },
      to: { path: '/(presentation|main)/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.architecture.json' },
  },
};
