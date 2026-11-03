<template>
  <div class="app-layout">
    <!-- 火烈鸟 HUOLIENIAO 全局顶栏导航 -->
    <header class="app-header">
      <div class="header-left">
        <NuxtLink to="/" class="brand-identity" :title="t('common.brandName') || '火烈鸟 HUOLIENIAO'">
          <!-- 火烈鸟全新矢量标识 -->
          <div class="brand-logo-wrap">
            <svg class="brand-logo-svg" viewBox="0 0 64 64" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="flam-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FF3366" />
                  <stop offset="100%" stop-color="#FF6584" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="14" fill="#16191F" stroke="#FF3366" stroke-width="1.5" stroke-opacity="0.35" />
              <!-- Flamingo S-Neck + Eye -->
              <path d="M 40 14 C 40 10, 34 8, 30 11 C 26 14, 26 19, 29 23 C 32 26, 32 30, 29 35 C 27 38, 24 40, 21 41 L 21 45 C 27 44, 32 40, 35 35 C 38 30, 37 25, 34 22 C 32 20, 32 17, 34 16 C 36 15, 38 15, 40 14 Z" fill="url(#flam-logo-grad)" />
              <path d="M 40 14 L 48 18 L 42 20 Z" fill="#FFF0F3" />
              <path d="M 45 17 L 48 18 L 42 20 Z" fill="#16191F" />
              <!-- Play Symbol Wing -->
              <path d="M 29 36 L 44 44 L 29 51 Z" fill="url(#flam-logo-grad)" />
            </svg>
          </div>
          <div class="brand-text">
            <div class="brand-title-row">
              <span class="brand-name">火烈鸟</span>
              <span class="brand-en">HUOLIENIAO</span>
              <span class="brand-badge">AI 短剧</span>
            </div>
            <span class="brand-sub">一站式短剧创作平台</span>
          </div>
        </NuxtLink>

        <!-- 主功能导航选项卡 -->
        <nav class="main-nav">
          <NuxtLink to="/" class="nav-tab" :class="{ active: isCurrentPath('/') }">
            <Film :size="15" :stroke-width="1.8" />
            <span>{{ t('nav.projects') || '项目' }}</span>
          </NuxtLink>
          <NuxtLink to="/assets" class="nav-tab" :class="{ active: isCurrentPath('/assets') }">
            <Layers :size="15" :stroke-width="1.8" />
            <span>{{ t('nav.assets') || '资产库' }}</span>
          </NuxtLink>
          <NuxtLink to="/skills" class="nav-tab" :class="{ active: isCurrentPath('/skills') }">
            <Sparkles :size="15" :stroke-width="1.8" />
            <span>{{ t('nav.skills') || 'Agent 技能' }}</span>
          </NuxtLink>
          <NuxtLink to="/settings" class="nav-tab" :class="{ active: isCurrentPath('/settings') }">
            <Settings :size="15" :stroke-width="1.8" />
            <span>{{ t('nav.settings') || '设置' }}</span>
          </NuxtLink>
        </nav>
      </div>

      <!-- 右侧控制区：语言切换 + GitHub 链接 -->
      <div class="header-right">
        <!-- 多语言切换器 -->
        <div class="lang-dropdown-wrap" @click.stop="toggleLangMenu">
          <button class="btn btn-ghost btn-sm lang-btn" :title="t('common.language') || '切换语言'">
            <Globe :size="14" :stroke-width="1.8" />
            <span class="current-lang-text">{{ currentLangLabel }}</span>
            <ChevronDown :size="12" :stroke-width="1.8" />
          </button>
          <div v-if="showLangMenu" class="lang-menu card">
            <button
              v-for="opt in langOptions"
              :key="opt.code"
              class="lang-menu-item"
              :class="{ active: locale === opt.code }"
              @click="changeLanguage(opt.code)"
            >
              <span>{{ opt.label }}</span>
              <span class="lang-code">{{ opt.code.toUpperCase() }}</span>
            </button>
          </div>
        </div>

        <!-- 官方 GitHub 开源链接 -->
        <a
          href="https://github.com/Glamyon/HUOLIENIAO"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-icon github-link"
          title="GitHub 源码仓库 (Glamyon/HUOLIENIAO)"
        >
          <Github :size="16" :stroke-width="1.8" />
        </a>
      </div>
    </header>

    <!-- 页面核心内容挂载点 -->
    <main class="app-main-content">
      <slot />
    </main>

    <!-- 全局轻提示容器 (vue-sonner) -->
    <Toaster position="top-right" richColors :theme="'dark'" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Film, Layers, Sparkles, Settings, Globe, Github, ChevronDown } from 'lucide-vue-next'
import { Toaster } from 'vue-sonner'

const route = useRoute()
const { t, locale } = useI18n()

function isCurrentPath(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const showLangMenu = ref(false)
function toggleLangMenu() {
  showLangMenu.value = !showLangMenu.value
}
function closeLangMenu() {
  showLangMenu.value = false
}

const langOptions = [
  { code: 'zh', label: '简体中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
]

const currentLangLabel = computed(() => {
  const target = langOptions.find(o => o.code === locale.value)
  return target ? target.label : '中文'
})

function changeLanguage(code: string) {
  locale.value = code
  showLangMenu.value = false
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('huolieniao_locale', code)
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('click', closeLangMenu)
    const saved = localStorage.getItem('huolieniao_locale')
    if (saved && ['zh', 'en', 'ja', 'ko'].includes(saved)) {
      locale.value = saved
    }
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('click', closeLangMenu)
  }
})
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-1);
}

.app-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: var(--surface-base);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 28px;
}

.brand-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  cursor: pointer;
}

.brand-logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: transform var(--transition-fast);
}

.brand-identity:hover .brand-logo-wrap {
  transform: scale(1.06);
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-0);
  letter-spacing: -0.2px;
}

.brand-en {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-text);
  letter-spacing: 0.8px;
}

.brand-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--accent-bg);
  color: var(--accent-text);
  border: 1px solid var(--accent-border);
}

.brand-sub {
  font-size: 10px;
  color: var(--text-3);
  line-height: 1.2;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  text-decoration: none;
  border-radius: var(--radius);
  transition: all var(--transition-fast);
}

.nav-tab:hover {
  background-color: var(--bg-hover);
  color: var(--text-1);
}

.nav-tab.active {
  background-color: var(--accent-bg);
  color: var(--accent-text);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lang-dropdown-wrap {
  position: relative;
}

.lang-btn {
  font-size: 12px;
  gap: 5px;
  padding: 4px 8px;
}

.current-lang-text {
  font-size: 12px;
}

.lang-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 140px;
  padding: 4px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}

.lang-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text-2);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.lang-menu-item:hover {
  background: var(--bg-hover);
  color: var(--text-1);
}

.lang-menu-item.active {
  color: var(--accent-text);
  font-weight: 600;
  background: var(--accent-bg);
}

.lang-code {
  font-size: 10px;
  color: var(--text-3);
  font-family: var(--font-mono);
}

.github-link {
  color: var(--text-2);
  text-decoration: none;
}

.github-link:hover {
  color: var(--text-1);
}

.app-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

@media (max-width: 768px) {
  .app-header { padding: 0 12px; }
  .brand-sub { display: none; }
  .brand-en { display: none; }
  .main-nav span { display: none; }
  .header-left { gap: 14px; }
}
</style>
