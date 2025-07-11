declare module 'crypto-browserify' {
  export function createHash(algorithm: string): {
    update(data: string | Buffer): any;
    digest(encoding: string): string;
  };
}