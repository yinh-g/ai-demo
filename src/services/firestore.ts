import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebase, initFirebase } from './firebase';
import { getCurrentUser } from './auth';

const COLLECTION = 'users';
const SUBCOLLECTION = 'state';
const DOC = 'sync';

export interface CloudState {
  schemaVersion: number;
  updatedAt: number;
  updatedAtByDevice: string;
  data: Record<string, unknown>;
}

function ensureInit() {
  return initFirebase();
}

function docRef() {
  const user = getCurrentUser();
  if (!user) throw new Error('未登录');
  const { db } = getFirebase();
  return doc(db, COLLECTION, user.uid, SUBCOLLECTION, DOC);
}

export async function readCloudState(): Promise<CloudState | null> {
  ensureInit();
  const snap = await getDoc(docRef());
  if (!snap.exists()) return null;
  return snap.data() as CloudState;
}

export async function writeCloudState(payload: CloudState): Promise<void> {
  ensureInit();
  await setDoc(docRef(), payload, { merge: false });
}
