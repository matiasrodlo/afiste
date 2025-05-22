<template lang="html">
<div class="textSuperior ">
  <div class="iconAfiste">
    <img :src="`${publicPath}logoAfiste.png`"/>
  </div>
  <div> UBR/CLP 6635.10 <span class="redColor">-2.73%</span> </div>
  <div>  UBR/USD 7555.00  <span class="redColor">-1.78%</span>  </div>
  <div> RPP/USD  4.0657 <span class="greenColor">0.33%</span>  </div>
  <div> RPI/CLP <span class="greenColor">9.73%</span> </div>
  <div type="button" class="vIcon" > + </div>
</div>
</template>

<script>
export default {
  data () {
    return {
      publicPath: process.env.BASE_URL
    }
  }
}
</script>

<style lang="scss" scoped>


.iconAfiste {
  float: left;
  height: 30px;
}

.textSuperior {
  & > div:not(:first-child )  {
    font-size: 12px;
    line-height: 5px;
    border: 1px solid #1e2b375c;
    float: left;
    word-spacing: 6pt;
    padding: 13px;
  }
}




</style>
