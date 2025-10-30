import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const isCloudflare = process.env.RUNTIME === 'cloudflare'

const config = defineConfig({
  plugins: [
    ...(isCloudflare
      ? [cloudflare({ viteEnvironment: { name: 'ssr' } })]
      : []),
      
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src',
    }),
    viteReact(),
  ],
})

export default config
