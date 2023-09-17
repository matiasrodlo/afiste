<template lang="html">
  <div >
    <b-row class=" mt-4 justify-content-center">
      <b-col cols="12">
        <b-form-group>
          <b-form-radio-group
            id="btn-radios-2"
            v-model="selectType"
            :options="options"
            buttons class="w-100 mt-2"
            button-variant="outline-primary"
            size="md"
            name="radio-btn-outline"
          ></b-form-radio-group>
        </b-form-group>
      </b-col>
    </b-row>
    <b-row class="p-1">
      <b-col cols="3" >Mercado</b-col>
      <b-col cols= "12">
        <b-form-select class="text-white" v-model="selectMerkat" :options="optionsMerkats"></b-form-select>
      </b-col>
    </b-row>
    <b-row class="p-1 justify-content-center">
      <b-col cols="8" >Cantidad </b-col>
      <b-col cols= "8">
        <b-form-input type="number" class="inputCustom text-white" v-model="number" size="sm" placeholder=""></b-form-input>
      </b-col>
      <b-col cols="8" >Precio unitario </b-col>
      <b-col cols= "8">
        <b-form-input type="number" class="inputCustom text-white" v-model="price" size="sm" placeholder=""></b-form-input>
      </b-col>
      <b-col cols= "8" class="mt-2">
        <span>TOTAL</span>
        <b-form-input class="inputCustom text-white" v-model="total" size="sm" disabled></b-form-input>
      </b-col>
    </b-row>
    <b-row class="p-1 mb-2 mt-2">
      <b-col cols="12" ><b-button block variant="outline-warning" @click="createOrder()" size="sm">Realizar orden</b-button></b-col>
    </b-row>
    <b-tabs  content-class="my-3 " justified >
      <b-tab title="Órdenes"  active>
        <table class="  table-border table-responsive tableTransacction ">
          <tbody class="borderStyle">
            <tr>
              <td>Tipo</td>
              <td>Mercado</td>
              <td>number<td>
              <td>price</td>
              <td>Total</td>
              <td>Cancelar</td>
            </tr>
            <tr v-for = "(order, index) in dataOrder">
              <td :class="{ greenColor: order.type == 'COMPRA', redColor: order.type == 'VENTA' }">{{order.type}}</td>
              <td>{{order.merkat}}</td>
              <td>{{order.number}}</td>
              <td>{{order.price}}</td>
              <td>{{order.total}}</td>
              <button @click="removeOrder(index)">x</button>
            </tr>
          </tbody>
        </table>
      </b-tab>
      <b-tab title="Intercambios" ><p>I'm the first tab</p> </b-tab>
      <b-tab title="Posiciones"><p>I'm the first tab</p></b-tab>
    </b-tabs>
  </div>
</template>

<script>
import { mapMutations } from 'vuex';
export default {
  data() {
    return {
      number: null,
      price: null,
      selectMerkat: null,
      selectType: null,
      options: [
        { text: 'Compra', value: 'COMPRA' },
        { text: 'Venta', value: 'VENTA' }
      ],
      optionsMerkats: [
        { text: 'Selecione mercado',value: null},
        { text: 'UBR/CLP', value: 'UBR/CLP' },
        { text: 'UBR/USD', value: 'UBR/USD' },
        { text: 'RPP/USD', value: 'RPP/USD' },
        { text: 'RPI/CLP', value: 'RPI/CLP' },
      ],
       dataOrder:
       [
          {
            type :'VENTA',
            merkat :'UBR/CLP',
            number :'100',
            price :'200',
            total : '20000'
          },
       ]
    }
  },
  computed: {
    total() {
      return this.number * this.price
    },
  },
  methods: {
    createOrder()  {
      if(this.selectMerkat && this.number && this.price && this.selectType){
        this.dataOrder.push({
          type: this.selectType,
          merkat: this.selectMerkat,
          number: this.number,
          price: this.price,
          total: this.price * this.number
        });
        this.$store.dispatch("dom/createOrder", {
          type: this.selectType,
          merkat: this.selectMerkat,
          number: this.number,
          price: this.price,
          money: 'CLP',
          total: this.price * this.number
        })
      }
      this.selected = ''
      this.selectMerkat = ''
      this.number = ''
      this.price = ''
    },
    createOrderX() {

    },
    removeOrder: function(index) {
      this.dataOrder.splice(index,1);
    }
  }
}
</script>
<style lang="scss">
.text-white {
  color: white;
}
.inputCustom {
  background-color: #e0dbdb36 !important;
  border: none !important;
}
.tableTransacction {
  height: 40vh;
  overflow-y: auto;
}
a:hover {
  color: white !important;
  border-radius: 0px !important;
}
li {
  margin: 0px;
}
.nav-tabs .nav-link.active {
  background-color: transparent;
  border-color: transparent;
  color: white;
  border-bottom: 1px solid white;
  margin: 0px ;
  border: 1px solid white ;
}
.nav-link {
  border: 2px solid #090e1730 ;
  background-color: #090e1730 ;
  color: white;
  border-bottom: 1px solid white;
  padding: 1px;
  padding-top: 5px;
  padding-bottom: 5px;
  margin: 0px ;
}
.borderStyle {
  border-bottom: 1px solid #bdb8b8;
  & > tr{
    border-bottom: 1px solid #bdb8b8;
    }
}
.nav-tabs {
    border-bottom: 0px solid transparent;
}
</style>
