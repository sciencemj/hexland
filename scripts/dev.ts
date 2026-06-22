export {};

async function build() {
  const r = await Bun.build({
    entrypoints: ['src/ui/main.tsx'],
    outdir: 'dist',
    target: 'browser',
  });
  if (!r.success) { console.error(r.logs); }
  else console.log('built', new Date().toISOString());
}
await build();

const watcher = (await import('node:fs')).watch('src', { recursive: true }, () => build());

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = Bun.file('.' + path);
    if (await file.exists()) return new Response(file);
    return new Response('not found', { status: 404 });
  },
});
console.log(`dev server: http://localhost:${server.port}`);
process.on('SIGINT', () => { watcher.close(); server.stop(); process.exit(0); });
