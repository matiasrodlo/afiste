<template lang="html">
  <div class="">
    <highcharts  class="graphCustom" :options="chartOptions"/>
  </div>
</template>
<script>
import {Chart} from 'highcharts-vue'
import { mapGetters } from 'vuex';


export default {
  components: {
    highcharts: Chart
  },
  computed: {
    ...mapGetters({
      divs: 'dom/divs',
    })
  },
  data() {
    return {
      chartOptions: {
        chart: {
            zoomType: 'xy',
            backgroundColor: 'transparent',

        },
        title: {
            text: '',
            align: 'left'
        },
        xAxis: [{
            categories: ['11 oct.', '12 oct.', '13 oct.', '14 oct.', '15 oct.', '16 oct.',
                '17 oct.', '18 oct.', '19 oct.', '20 oct.', '21 oct.', '22 oct.'],
            crosshair: true,
            labels: {
              style: {
                color: '#bdb8b8'
              }
            }
        }],
        yAxis: [{ // Primary yAxis
          labels: {
              format: '{value}',
              style: {
                  color: '#f7107a'
              }
          },
          title: {
              text: '',
              style: {
                  color: 'white'
              }
          },
          opposite: true
        }, { // Secondary yAxis
          gridLineWidth: 0,
          title: {
              text: '',
              style: {
                  color: '#f7107a'
              }
          },
          labels: {
              format: '{value} ',
              style: {
                  color: 'white'
              }
          }
        }, { // Tertiary yAxis
          gridLineWidth: 0,
          title: {
              text: '',
              style: {
                  color: '#f7107a'
              }
          },
          labels: {
              format: '{value} ',
              style: {
                  color: 'white'
              }
          },
          opposite: true
        }],
        tooltip: {
            shared: true
        },
        legend: {
            layout: 'vertical',
            align: 'left',
            x: 80,
            verticalAlign: 'top',
            y: 55,
            floating: true,
            backgroundColor: 'transparent'
        },
        plotOptions: {
            area: {
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1},
                    stops: [
                        [0, '#70a800'],
                        [1, '#f7107a']
                    ]
                },
                marker: {
                    enabled: false
                },
                shadow: false,
                states: {
                    hover: {
                    }
                },
                threshold: null
            }
        },
        series: [{
          name: '',
          type: 'column',
          yAxis: 1,
          color: '#70a800',
          data: [49.9, 71.5, 106.4, 129.2, 144.0, 176.0, 49.9, 71.5, 106.4, 129.2, 144.0, 176.0, 135.6, 148.5, 216.4, 194.1, 95.6, 54.4 ,135.6, 148.5, 216.4, 194.1, 95.6, 54.4],
          tooltip: {
            valueSuffix: ' '
          }
        }, {
            name: '',
            type: 'spline',
            yAxis: 2,
            color: '#f7107a',
            data: [1016, 1016, 1015.9, 1015.5, 1012.3, 1009.5, 1016, 1016, 1015.9, 1015.5, 1012.3, 1009.5, 1009.6, 1010.2, 1013.1, 1016.9, 1018.2, 1016.7, 1009.6, 1010.2, 1013.1, 1016.9, 1018.2, 1016.7],
            marker: {
              enabled: false
            },
            dashStyle: 'shortdot',
            tooltip: {
              valueSuffix: ''
            }
        }, {
            name: '',
            type: 'spline',
            data: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6],
            tooltip: {
                valueSuffix: ''
            }
        }],
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 500,
                    maxHeight: 100
                },
                chartOptions: {
                    legend: {
                        floating: false,
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom',
                        x: 0,
                        y: 0
                    },
                    yAxis: [{
                        labels: {
                            align: 'right',
                            x: 0,
                            y: -6
                        },
                        showLastLabel: false
                    }, {
                        labels: {
                            align: 'left',
                            x: 0,
                            y: -6
                        },
                        showLastLabel: false
                    }, {
                        visible: false
                    }]
                }
            }]
        }
      }
    }
  },

}
</script>

<style lang="css" scoped>


.graphCustom {
  width: 90% !important;
  min-height: calc(30vh - 30px) !important;
  float: left;
  background-color: transparent ;
  min-width: 310px;
  max-width: 1040px;
  height: 100px !important;
  max-height: 100px !important; margin: 0 auto

}

</style>
