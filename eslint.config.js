
export default [
  {
    files: ['.eslintrc.{js,cjs}'],
    languageOptions: {
      globals: {
        browser: true,
        commonjs: true,
        es2021: true,
      },
      parserOptions: {
        sourceType: 'script',
      },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
    },
    rules: {
      // Puedes añadir las reglas válidas que soporta el plugin
      // Ejemplo:
      // 'bot-whatsapp/valid-bot': 'error',
    },
  },
];
