import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import feather from 'vue-icon'
import BootstrapVue from 'bootstrap-vue'

// app.js
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'


// This imports all the layout components such as <b-container>, <b-row>, <b-col>:
import { LayoutPlugin } from 'bootstrap-vue'
import { ModalPlugin } from 'bootstrap-vue'
import { CardPlugin } from 'bootstrap-vue'
import { VBScrollspyPlugin } from 'bootstrap-vue'
import { DropdownPlugin, TablePlugin } from 'bootstrap-vue'

Vue.use(CardPlugin)
Vue.use(LayoutPlugin)
Vue.use(ModalPlugin)
Vue.use(VBScrollspyPlugin)
Vue.use(DropdownPlugin)
Vue.use(TablePlugin)

Vue.use(BootstrapVue)
Vue.use(feather, 'v-icon')
Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
