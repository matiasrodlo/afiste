<template lang="html">
  <div >
    <div  id="thechart"/>
    <FavoriteMerkats class="subContainer"/>
  </div>
</template>
<script>
import Highcharts from "highcharts";
import exportingInit from "highcharts/modules/exporting";
import dataInit from "highcharts/modules/data";
import FavoriteMerkats from './favorite-merkats'
import { mapGetters } from 'vuex';

export default {
  components: {
    FavoriteMerkats
  },
  created() {
    this.Bids1 = this.ordersSell,
    this.Bids2 = this.ordersBuy,
    this.chartOptions = {
      chart: {
        renderTo: 'thechart',
        type: 'area',
        zoomType: 'xy',
        backgroundColor: 'transparent',
        inverted: true
      },
      title: {
          text: ''
      },
      xAxis: {
          minPadding: 0,
          maxPadding: 0,
          plotLines: [{
              color: '#888',
              value: 0.1523,
              width: 1
          }],
      },
      yAxis: [{
          lineWidth: 1,
          gridLineWidth: 0,
          title: null,
          tickWidth: 1,
          tickLength: 5,
          tickPosition: 'inside',
          labels: {
              align: 'left',
              x: 8
          }
      }, {
          opposite: true,
          linkedTo: 0,
          lineWidth: 1,
          gridLineWidth: 0,
          title: null,
          tickWidth: 1,
          tickLength: 5,
          tickPosition: 'inside',
          labels: {
              align: 'right',
              x: -8
          }
      }],
      legend: {
          enabled: false
      },
      plotOptions: {
          area: {
              fillOpacity: 0.2,
              lineWidth: 2,
              step: 'center'
          }
      },
      tooltip: {
          headerFormat: '<span class="spanStyle> Precio: {point.key}</span><br/>',
          valueDecimals: 2
      },
      series: [
        {
          name: 'Venta',
          data: this.Bids1,
          color: '#f7107a'
        },{
          name: 'Compra',
          data: this.Bids2,
          color: '#70a800'
        }
      ],
    };

  },
  mounted() {
    this.chart = new Highcharts.chart(this.chartOptions)
  },
  computed: {
    ...mapGetters({
      ordersX: 'dom/orders',
      ordersBuy: 'dom/ordersBuy',
      ordersSell: 'dom/ordersSell',
    })
  },
  data() {
    return {
      chart:undefined,
      graphok: true,
      chartOptions: null,
      Bids1: null,
      Bids2: null,
    }
  },

}
</script>

<style lang="css" scoped>
#thechart {
  margin-top: 20px;
  background-color: transparent !important;
  height: 50vh;
}

.spanStyle {
    font-size:10px;
  }

</style>
