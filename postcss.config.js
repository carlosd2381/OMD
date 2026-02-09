import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import postcssOklabFunction from '@csstools/postcss-oklab-function';

export default {
  plugins: [
    tailwindcss(),
    postcssOklabFunction({
      preserve: false,
    }),
    autoprefixer(),
  ],
};
