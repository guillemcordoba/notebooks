// import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';
import { fromRollup } from '@web/dev-server-rollup';
import rollupReplace from '@rollup/plugin-replace';
import rollupCommonjs from '@rollup/plugin-commonjs';
import { fromRollupWithFix, fixExportNamedExports } from './fixes.mjs';

const commonjs = fromRollupWithFix(rollupCommonjs);

const replace = fromRollup(rollupReplace);

/** Use Hot Module replacement by adding --hmr to the start command */
const hmr = process.argv.includes('--hmr');

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  open: true,
  watch: !hmr,
  /** Resolve bare module imports */
  nodeResolve: {
    exportConditions: ['browser', 'development'],
    browser: true,
    preferBuiltins: false,
  },

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto'

  /** Set appIndex to enable SPA routing */
  appIndex: './index.html',
  clearTerminalOnReload: false,

  plugins: [
    replace({
      'process.env.HC_PORT': JSON.stringify(process.env.HC_PORT),
      'process.env.ADMIN_PORT': JSON.stringify(process.env.ADMIN_PORT),
      '  COMB =': 'window.COMB =',
      'await fetch(LAUNCHER_ENV_URL)': '{status: 404}',
      delimiters: ['', ''],
    }),

    commonjs(),
    fixExportNamedExports(),
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    // hmr && hmrPlugin({ exclude: ['**/*/node_modules/**/*'], presets: [presets.litElement] }),
  ],

  // See documentation for all available options
});
