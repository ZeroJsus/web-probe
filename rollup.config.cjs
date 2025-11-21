const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const { babel } = require('@rollup/plugin-babel');

module.exports = {
  input: 'src/index.js',
  output: {
    file: 'dist/probe.iife.js',
    format: 'iife',
    name: 'WebProbe',
    sourcemap: true
  },
  plugins: [
    nodeResolve(),
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
        ]
      ],
      extensions: ['.js'],
      comments: false
    })
  ]
};
