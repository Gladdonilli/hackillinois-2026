// Cloudflare Workers runtime type declarations
// Inline because @cloudflare/workers-types npm install fails on this Node/npm version

declare interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

declare interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

declare interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

declare interface D1ExecResult {
  count: number;
  duration: number;
}

declare interface R2Bucket {
  put(key: string, value: ArrayBuffer | ReadableStream | string | Blob, options?: R2PutOptions): Promise<R2Object>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string | string[]): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
  head(key: string): Promise<R2Object | null>;
}

declare interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

declare interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

declare interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

declare interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

declare interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  include?: ('httpMetadata' | 'customMetadata')[];
}

declare interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}

// ─── Workers AI Types ───
declare interface Ai {
  run(
    model: string,
    inputs: Record<string, unknown>,
    options?: { gateway?: { id: string; skipCache?: boolean; cacheTtl?: number } }
  ): Promise<unknown>;
}

// ─── Vectorize Types ───
declare interface VectorizeIndex {
  upsert(vectors: VectorizeVector[]): Promise<VectorizeMutationResult>;
  query(
    vector: number[],
    options?: {
      topK?: number;
      returnMetadata?: 'all' | 'indexed' | 'none';
      returnValues?: boolean;
      filter?: Record<string, unknown>;
      namespace?: string;
    }
  ): Promise<VectorizeQueryResult>;
  getByIds(ids: string[]): Promise<VectorizeVector[]>;
  deleteByIds(ids: string[]): Promise<VectorizeMutationResult>;
  describe(): Promise<VectorizeIndexInfo>;
}

declare interface VectorizeVector {
  id: string;
  values: number[];
  metadata?: Record<string, string | number | boolean>;
  namespace?: string;
}

declare interface VectorizeQueryResult {
  count: number;
  matches: VectorizeMatch[];
}

declare interface VectorizeMatch {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, string | number | boolean>;
}

declare interface VectorizeMutationResult {
  count: number;
  ids: string[];
}

declare interface VectorizeIndexInfo {
  dimensions: number;
  vectorCount: number;
  processedUpTo: number;
}
