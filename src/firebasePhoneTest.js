import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';

let auth;

export async function beginFirebasePhoneTest(config, container, phone) {
  if (!auth) {
    auth = initializeAuth(initializeApp(config), { persistence: inMemoryPersistence });
    // This module is only reachable from the loopback demo with a fictional number.
    auth.settings.appVerificationDisabledForTesting = true;
  }

  const verifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
  try {
    const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
    return async code => {
      const { user } = await confirmation.confirm(code);
      try {
        return await user.getIdToken();
      } finally {
        await signOut(auth);
      }
    };
  } finally {
    verifier.clear();
  }
}
