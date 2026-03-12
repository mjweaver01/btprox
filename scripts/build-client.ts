import tailwind from 'bun-plugin-tailwind';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const OUT_DIR = join(ROOT, 'dist', 'client');

const result = await Bun.build({
  entrypoints: [join(ROOT, 'src/client/src/main.tsx')],
  outdir: OUT_DIR,
  plugins: [tailwind],
  target: 'browser',
  minify: true,
  splitting: true,
  sourcemap: 'external',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Find the output JS and CSS file names
const jsFile = result.outputs.find(o => o.path.endsWith('.js'));
const cssFile = result.outputs.find(o => o.path.endsWith('.css'));

const jsName = jsFile ? jsFile.path.split('/').pop() : 'main.js';
const cssName = cssFile ? cssFile.path.split('/').pop() : '';

// Copy index.html with rewritten asset references
const html = await Bun.file(join(ROOT, 'src/client/index.html')).text();
const rewritten = html
  .replace(
    '</head>',
    `  ${cssName ? `<link rel="stylesheet" href="./${cssName}" />` : ''}\n  </head>`
  )
  .replace(
    '<script type="module" src="./src/main.tsx"></script>',
    `<script type="module" src="./${jsName}"></script>`
  );

await Bun.write(join(OUT_DIR, 'index.html'), rewritten);

console.log(`Build complete → ${OUT_DIR}`);
for (const output of result.outputs) {
  const size = output.size;
  const name = output.path.split('/').pop();
  console.log(`  ${name} (${(size / 1024).toFixed(1)} KB)`);
}
