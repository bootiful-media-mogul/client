/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  rules: {
    'vue/multi-word-component-names': 'off', // Disable the rule
    // a parameter a signature needs but the body doesn't can say so with a leading _
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // a label may name its control by nesting it or by for=/id; the default asks for both
    'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
    // Icon renders an <img> or a labelled svg, so a link around one has content
    'vuejs-accessibility/anchor-has-content': ['error', { accessibleChildren: ['Icon'] }],
    // mouse-only controls: the clickable Icon and a few clickable divs. known and not
    // fixed yet, so they stay visible as warnings rather than failing the lint
    'vuejs-accessibility/click-events-have-key-events': 'warn',
    'vuejs-accessibility/no-static-element-interactions': 'warn',
    'vuejs-accessibility/mouse-events-have-key-events': 'warn'
  },
  root: true,
  'extends': [
    'plugin:vue/vue3-essential',
    'plugin:vuejs-accessibility/recommended',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  }
}
