import Vue from 'vue';
import Vuex from 'vuex';
import dom from './modules/dom';

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    dom
  },
});
