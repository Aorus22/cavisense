import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

// RUNTIME can be 'nitro' (default), 'cloudflare', or 'custom'.
// - 'nitro' uses the 'nitro/vite' plugin (must be installed).
// - 'cloudflare' uses '@cloudflare/vite-plugin' (must be installed).
// - 'custom' intentionally uses no runtime-specific plugin (no extra deps required).
export default defineConfig(async () => {
  const runtime = process.env.RUNTIME || 'nitro'
  const plugins: any[] = []

  if (runtime === 'cloudflare') {
    // try to load cloudflare plugin if available
    try {
      const mod = await import('@cloudflare/vite-plugin')
      const cloudflare = (mod as any).cloudflare ?? (mod as any).default
      if (typeof cloudflare === 'function') {
        plugins.push(cloudflare({ viteEnvironment: { name: 'ssr' } }))
      } else {
        console.warn('@cloudflare/vite-plugin did not export a cloudflare function')
      }
    } catch (err) {
      // plugin not installed — fall back to continuing without it
      console.warn('Cloudflare plugin not found. Proceeding without cloudflare plugin.')
    }
  } else if (runtime === 'nitro') {
    // default: try to load nitro plugin if available
    try {
      const mod = await import('nitro/vite')
      const nitro = (mod as any).nitro ?? (mod as any).default
      if (typeof nitro === 'function') {
        plugins.push(nitro())
      } else {
        console.warn('nitro/vite did not export a nitro function')
      }
    } catch (err) {
      console.warn('Nitro plugin not found. Proceeding without nitro plugin.')
    }
  } else {
    // custom: intentionally no runtime plugin
  }

  // common plugins
  plugins.push(
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src',
    }),
    viteReact()
  )

  return {
    plugins,
  }
})
