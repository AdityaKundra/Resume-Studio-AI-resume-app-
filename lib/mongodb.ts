import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "resume_studio";

type MongoGlobal = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

export function isMongoConfigured(): boolean {
  return Boolean(uri && uri.length > 0);
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  const g = globalThis as MongoGlobal;
  if (!g._mongoClientPromise) {
    const client = new MongoClient(uri);
    g._mongoClientPromise = client.connect();
  }
  return g._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}

let indexesEnsured = false;

export async function ensureDbIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  await db.collection("profiles").createIndex({ userId: 1 }, { unique: true });
  await db.collection("resume_versions").createIndex(
    { userId: 1, versionId: 1 },
    { unique: true }
  );
  await db.collection("resume_versions").createIndex({ userId: 1, timestamp: -1 });
  await db.collection("interview_prep").createIndex(
    { userId: 1, sourceSig: 1 },
    { unique: true }
  );
  indexesEnsured = true;
}
