import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({ out: 'build', precompress: false }),
    // En escritorio no hace falta service worker: todo se sirve en local
    serviceWorker: { register: false }
  },

  preprocess: [
    preprocess({
      postcss: true
    })
  ]
};
