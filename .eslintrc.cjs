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
    'vuejs-accessibility/anchor-has-content': ['error', { accessibleChildren: ['Icon'] }]
  },
  overrides: [
    {
      // these hand their label in from outside: Input takes the id its caller's label
      // points at, and the selects name their <select> from a label or placeholder prop
      files: ['src/ui/Input.vue', 'src/blogs/BlogsSelect.vue', 'src/podcasts/PodcastsSelect.vue'],
      rules: { 'vuejs-accessibility/form-control-has-label': 'off' }
    },
    {
      // Icon binds role="button" (and tabindex and key handlers) whenever it has a click
      // listener, which the rule can't see. a comment can't switch it off in the template:
      // one at the root makes the component a fragment, and its attributes stop falling through
      files: ['src/ui/Icon.vue'],
      rules: { 'vuejs-accessibility/no-static-element-interactions': 'off' }
    }
  ],
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
