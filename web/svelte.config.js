import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({ out: 'build', precompress: false })
  },

  preprocess: [
    preprocess({
      postcss: true
    })
  ]
};
