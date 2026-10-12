import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';

const SERVER_SELECTION_TIMEOUT_MS = 10_000;

// Host and database only; never log credentials from the URI.
function describeUri(uri) {
  try {
    const { protocol, host, pathname } = new URL(uri);
    return `${protocol}//${host}${pathname === '/' ? '' : pathname}`;
  } catch {
    return '(unparseable MONGO_URI)';
  }
}

// Driver messages can echo the connection string; mask any user:password@ part.
export const redactCredentials = (text) =>
  String(text).replace(/(mongodb(?:\+srv)?:\/\/)[^\s@]+@/gi, '$1***:***@');

const NETWORK_HINTS = [
  'Set DNS_SERVERS in server/.env (e.g. 8.8.8.8,1.1.1.1) if your ISP/router DNS refuses SRV lookups (development only).',
  'Add your current IP under Atlas > Network Access (IP access list).',
  'Check in Atlas that the cluster is not paused.',
  'Or use the standard "mongodb://" connection string (Atlas > Connect > Drivers) to skip the SRV lookup.',
];

// Turn the common Atlas failures into an actionable message.
function explain(err) {
  const msg = redactCredentials(err?.message ?? String(err));
  if (/bad auth|authentication failed|auth.*failed|unescaped characters/i.test(msg) || err?.code === 18) {
    return 'Authentication failed: check username/password in MONGO_URI (URL-encode special characters).';
  }
  if (/querySrv|ENOTFOUND|ECONNREFUSED|ENODATA|ETIMEOUT/i.test(msg)) {
    return `Cluster host not found or unreachable (${msg}). Try:\n${NETWORK_HINTS.map((h) => `  - ${h}`).join('\n')}`;
  }
  if (err?.name === 'MongooseServerSelectionError' || /timed out/i.test(msg)) {
    return 'Could not reach any MongoDB server: if using Atlas, add your IP under Network Access; otherwise make sure mongod is running.';
  }
  return msg;
}

let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  const { connection } = mongoose;
  connection.on('disconnected', () => console.warn('[db] MongoDB disconnected'));
  connection.on('reconnected', () => console.log('[db] MongoDB reconnected'));
  connection.on('error', (err) => console.error('[db] MongoDB error:', redactCredentials(err.message)));
}

export async function connectDB() {
  mongoose.set('strictQuery', true);
  // Build indexes automatically in development; manage them deliberately in production.
  mongoose.set('autoIndex', !env.isProd);

  // mongodb+srv:// needs an SRV DNS lookup, which some ISP/router resolvers refuse.
  // setServers() only affects dns.resolve*() (what the driver uses for SRV/TXT), not dns.lookup().
  // Local workaround only: in production (Render) the host's own resolvers are used.
  if (!env.isProd && env.MONGO_URI.startsWith('mongodb+srv://')) {
    dns.setServers(env.DNS_SERVERS);
    console.log(`[db] Using DNS servers for SRV lookup: ${env.DNS_SERVERS.join(', ')}`);
  }

  console.log(`[db] Connecting to ${describeUri(env.MONGO_URI)} ...`);
  const startedAt = Date.now();

  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    });
  } catch (err) {
    throw new Error(`[db] MongoDB connection failed. ${explain(err)}`, { cause: err });
  }

  attachConnectionListeners();
  const { host, name } = mongoose.connection;
  console.log(`[db] MongoDB connected: ${host}/${name} (${Date.now() - startedAt} ms)`);
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  console.log('[db] MongoDB connection closed');
}
