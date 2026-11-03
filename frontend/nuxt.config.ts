import { resolve } from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // SPA 纯客户端渲染模式（轻量、低延迟、同源代理）
  ssr: false,

  app: {
    head: {
      title: '火烈鸟 HUOLIENIAO — AI 短剧生成平台',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
        {
          name: 'description',
          content: '基于 TypeScript 全栈的 AI 短剧自动化生产平台 · A full-stack TypeScript platform for automated AI short-drama production',
        },
        { name: 'keywords', content: '火烈鸟,HUOLIENIAO,AI短剧,AutoDL,MiniMax H3,短剧生成,AIGC,剧本改写,分镜制作' },
        { name: 'theme-color', content: '#FF3366' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'alternate icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  // 引入火烈鸟品牌视觉系统与全局主题规范样式
  css: [
    '~/app/assets/studio.css',
  ],

  // 本地开发服务端口设置 (默认 3013)
  devServer: {
    port: 3013,
  },

  // Nitro 开发期后端反向代理 (对齐 Hono 端口 5679)
  nitro: {
    devProxy: {
      '/api': {
        target: 'http://127.0.0.1:5679/api',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://127.0.0.1:5679/static',
        changeOrigin: true,
      },
    },
  },

  // 手动注册视图动态路由 (views/drama 核心工作台)
  hooks: {
    'pages:extend'(pages) {
      pages.push(
        {
          name: 'drama-detail',
          path: '/drama/:id',
          file: resolve(__dirname, 'app/views/drama/detail.vue'),
        },
        {
          name: 'drama-episode',
          path: '/drama/:dramaId/episode/:episodeId',
          file: resolve(__dirname, 'app/views/drama/episode.vue'),
        },
      )
    },
  },

  // 兼容性日期
  compatibilityDate: '2024-11-01',
})
