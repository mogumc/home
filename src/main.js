import { createApp } from 'vue'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './styles/global.css'
import App from './App.vue'
import router from './router'
import { applyAppearance } from './config'
import { fitText } from './directives/fitText'

// 背景图 / 遮罩在挂载前就写好，避免开局闪一下默认背景
applyAppearance()

createApp(App).use(router).directive('fit-text', fitText).mount('#app')
