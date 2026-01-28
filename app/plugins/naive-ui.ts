import { setup } from '@css-render/vue3-ssr'

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) {
    const { collect } = setup(nuxtApp.vueApp)
    nuxtApp.ssrContext!.head.push({
      style: () =>
        collect()
          .split('</style>')
          .map((block) => {
            const id = block.match(/cssr-id="(.+?)"/)
            const style = (block.match(/>([\s\S]+)/) || [])[1] || ''
            return {
              'cssr-id': id ? id[1] : undefined,
              innerHTML: style
            }
          })
    })
  }
})
