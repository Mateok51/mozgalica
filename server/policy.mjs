export const ROOM_TTL = 2 * 60 * 60 * 1000;
export const IDLE_TTL = 30 * 60 * 1000;
export const MAX_PACKET = 8192;
export const MAX_JOURNAL = 3 * 1024 * 1024;
export const validCode = value => typeof value === 'string' && /^[A-Z]{4}$/.test(value);
export const validSecret = value => typeof value === 'string' && /^[A-Za-z0-9_-]{22}$/.test(value);
export const validPid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(value) && !value.startsWith('bot-');
export const validKey = value => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
export const validName = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 12 && !/[\u0000-\u001f\u007f]/.test(value);
export const validAvatar = value => Number.isInteger(value) && value >= 0 && value < 10;
export function validIdentity(value) {
  return value && validPid(value.pid) && validKey(value.sk) && validName(value.name) && validAvatar(value.av);
}
export function bounded(value) {
  let count = 0, length = 0;
  function visit(v, depth) {
    if (++count > 256 || depth > 6) return false;
    if (v == null || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v === 'string') { length += v.length; return length <= 4000; }
    if (typeof v !== 'object' || (Array.isArray(v) && v.length > 256)) return false;
    for (const key of Object.keys(v)) {
      length += key.length;
      if (length > 4000 || ['__proto__','prototype','constructor'].includes(key) || !visit(v[key],depth+1)) return false;
    }
    return true;
  }
  return visit(value,0);
}
export const randomSecret = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
};
export const randomCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes,n=>String.fromCharCode(65+n%26)).join('');
};
export function controlAllowed(method,args) {
  if (!Array.isArray(args)) return false;
  if (['start','skip','restart'].includes(method)) return args.length === 0;
  if (method === 'setBots') return args.length === 1 && Number.isInteger(args[0]) && args[0]>=0 && args[0]<=6;
  if (method !== 'setOpt' || args.length !== 2) return false;
  const [key,value] = args;
  if (['pacts','bs','tvq','rc','tk'].includes(key)) return typeof value === 'boolean';
  if (key === 'len') return ['brza','std','duga'].includes(value);
  if (key === 'end') return ['pyr','throne'].includes(value);
  return ['cats','mg'].includes(key) && Array.isArray(value) && value.length<=100 && value.every(s=>typeof s==='string'&&s.length<=100);
}

// Canonicalize only documented game fields; arbitrary padding never enters the journal.
export function gamePayload(value, social=false) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !bounded(value)) return null;
  const allowed = social ? ['k','id','from','to','yes','on','c'] : ['s','c','t','p','r','b','v','x','y','ok','f','pp'];
  if (Object.keys(value).some(key => !allowed.includes(key))) return null;
  const clean = {};
  for (const [key,v] of Object.entries(value)) {
    if (Array.isArray(v)) {
      if (!['r','v'].includes(key) || v.length > 64 || !v.every(Number.isInteger)) return null;
      clean[key] = v.slice();
    } else if (typeof v === 'string') {
      if (!['k','from','to','t','p','v','x'].includes(key) || v.length > (['k','p'].includes(key) ? 16 : 40)) return null;
      clean[key] = v;
    } else if (typeof v === 'number') {
      if (!Number.isFinite(v) || Math.abs(v) > 1000000000000000) return null;
      clean[key] = v;
    } else if (typeof v === 'boolean') clean[key] = v;
    else return null;
  }
  return clean;
}
