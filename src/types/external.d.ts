declare module 'ioredis' {
  const Redis: any;
  export default Redis;
}

declare module '@supabase/supabase-js' {
  export function createClient(url: string, key: string): any;
  export type SupabaseClient = any;
}

declare module 'fastify' {
  import { IncomingMessage, ServerResponse, Server } from 'http';
  type FastifyPluginCallback = any;
  interface FastifyInstance {
    get: (...args: any[]) => any;
    listen: (...args: any[]) => Promise<void>;
  }
  function Fastify(opts?: any): FastifyInstance;
  export default Fastify;
  export interface FastifyRequest {}
  export interface FastifyReply {}
  export { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginCallback };
}