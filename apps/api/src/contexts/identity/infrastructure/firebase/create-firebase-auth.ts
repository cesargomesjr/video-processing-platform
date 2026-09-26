import {
  applicationDefault,
  getApp,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
export type FirebaseAuthConfig = Readonly<{
  projectId: string;
  useEmulator: boolean;
}>;

function findOrCreateFirebaseApp(config: FirebaseAuthConfig): App {
  const appName = `fiapx-${config.projectId}`;
  const existingApp = getApps().find((app) => app.name === appName);

  if (existingApp !== undefined) {
    return getApp(appName);
  }

  if (config.useEmulator) {
    return initializeApp({ projectId: config.projectId }, appName);
  }

  return initializeApp(
    {
      credential: applicationDefault(),
      projectId: config.projectId,
    },
    appName,
  );
}

export function createFirebaseAuth(config: FirebaseAuthConfig): Auth {
  return getAuth(findOrCreateFirebaseApp(config));
}
