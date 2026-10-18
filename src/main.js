import { createApp } from 'vue'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './styles/global.css'
import App from './App.vue'
import router from './router'
import { applyAppearance, initBackground } from './config'
import { fitText } from './directives/fitText'

// 遮罩 / 语言先落上，背景图异步解析（接口是随机图，只解析一次）
applyAppearance()
initBackground()

createApp(App).use(router).directive('fit-text', fitText).mount('#app')
