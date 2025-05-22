// import { setupApiInstance, getApiInstance, setAccessToken } from 'utils/api';
import Axios from "axios"
import { api } from "@/utils/config"
import moment from 'moment'

const state = {
  reloadOrders: false,
  divs: {
    OrderBook: true,
    DeepPrice: true,
    PriceHistory: true,
    Tradding: true
  },
  orders: []

};

const getters = {
  reloadOrders: state => state.reloadOrders,
  divs: state => state.divs,
  orders: state => {
    console.log("ORDER");
    if(state.orders) state.orders.forEach((o) => {
      o.dateCreate = moment(o.dateCreate).format('YYYY-MM-DD hh:mm')
    })
    console.log(state.orders);
    return state.orders
  },
  ordersSell: state => {
    var deepValues = []
    state.orders.forEach((order) => {
      if(order.type == 'VENTA') deepValues.push([order.price, order.number])
    })
    return deepValues
  },
  ordersBuy: state => {
    var deepValues = []
    state.orders.forEach((order) => {
      if(order.type == 'COMPRA') deepValues.push([order.price, order.number])
    })
    return deepValues
  },
};

const actions = {
  async fetchOrders({ commit }, value) {
    commit('setReloadOrders', false)
    return Axios.get(api + "/orders")
    .then(response => {
      commit('setOrders', response.data.orders)
      console.log("Ordenes obtenidas: " + response.data.length);
      console.log(response.data.orders);
      commit('setReloadOrders', true)

    })
    .catch(error => {
      commit('setOrders', [])
      console.log(error)
    })
  },

  async createOrder({ commit, dispatch }, value) {
    return Axios.post(api + "/order", value)
    .then(response => {
      console.log("Order creada (Sin validaciones)");
      console.log(response.data.orden);
      dispatch('fetchOrders')
    })
    .catch(error => {
      console.log(error)
    })
  }
};

const mutations = {
  setReloadOrders(state, val) {
    state.reloadOrders = val
  },
  changeDivs(state, val) {
    state.divs = val
  },
  setOrders(state, val) {
    state.orders = val
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
