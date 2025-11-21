const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const { babel } = require('@rollup/plugin-babel');
const copy = require('rollup-plugin-copy');
const serve = require('rollup-plugin-serve');
const livereload = require('rollup-plugin-livereload');

const EXTENSIONS = ['.js', '.ts', '.mjs', '.json'];

module.exports = {
  input: 'src/index.ts',
  output: {
    file: 'dist/probe.iife.js',
    format: 'iife',
    name: 'WebProbe',
    sourcemap: true
  },
  plugins: [
    nodeResolve({ extensions: EXTENSIONS }),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      presets: [
        [
          '@babel/preset-env',
          {
            targets: '>0.25%, not dead, not op_mini all',
            bugfixes: true,
            modules: false
          }
        ],
        [
          '@babel/preset-typescript',
          {
            allowDeclareFields: true
          }
        ]
      ],
      extensions: EXTENSIONS,
      comments: false
    }),
    copy({
      targets: [
        {
          src: 'index.html',
          dest: 'dist',
          transform: (contents) =>
            contents.toString().replace('./dist/probe.iife.js', './probe.iife.js')
        }
      ]
    }),
    process.env.SERVE
      ? serve({
          open: true,
          verbose: true,
          contentBase: 'dist',
          historyApiFallback: false,
          host: '0.0.0.0',
          port: 4173
        })
      : null,
    process.env.SERVE ? livereload({ watch: 'dist' }) : null
  ].filter(Boolean)
};
