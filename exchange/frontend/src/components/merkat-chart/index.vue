<template lang="html">
  <div class="">
    <div class="graphCustom mt-4" id="chartCandlestick"/>
    <!-- <highcharts id="2" ref="highcharts2"  :options="chartOptions"/> -->
    <div class="sideTools vIcon">
      <v-icon  name="trending-down"></v-icon>
      <v-icon  name="plus"></v-icon>
      <v-icon  name="sliders"></v-icon>
      <v-icon  name="minimize-2"></v-icon>
      <v-icon  name="minus-square"></v-icon>
      <v-icon  name="git-merge"></v-icon>
    </div>
  </div>
</template>
<script>
import Highcharts from "highcharts/highstock";
// import dataInit from "highcharts/modules/data";
import configData from './config-data.js'
import { mapGetters } from 'vuex';

export default {
  computed: {
    ...mapGetters({
      divs: 'dom/divs',
    })
  },
  mounted() {
    this.chart = new Highcharts.stockChart(this.chartOptions)
  },
  created() {
    this.chartOptions = {
      chart: {
        renderTo: 'chartCandlestick',
        type: 'candlestick',
        backgroundColor: 'transparent',
      },
      rangeSelector: {
          selected: 1
      },
      stockTools: {
          gui: {
              enabled: true // disable the built-in toolbar
          }
      },
      navigation: {
          bindingsClassName: 'tools-container'
      },
      navigator: {
          enabled: false
      },

      series: [{
          type: 'candlestick',
          name: 'CLP / UBR',
          data: this.data,
          dataGrouping: {
              units: [
                  [
                      'week', // unit name
                      [1] // allowed multiples
                  ], [
                      'month',
                      [1, 2, 3, 4, 6]
                  ]
              ]
          }
      }],
      plotOptions: {
       candlestick: {
         color: '#70a800',
         upColor: '#f7107a'
       }
      },
    }
  },
  data() {
    return {
      chart:undefined,
      chartOptions: null,
      data: configData
    }
  },

}
</script>

<style lang="scss" scoped>

.sideTools {
  width: 10% !important;
  float: right;
  padding: 15px;
  margin-top: 20px;
}

.graphCustom {
  width: 90% !important;
  min-height: calc(60vh - 30px) !important;
  float: left;
}




</style>
