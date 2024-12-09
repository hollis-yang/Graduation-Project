<template>
  <div id="cesiumContainer"></div>
  <div class="control-panel">
    <div class="inner">
      <div class="title">参数控制</div>
      <div class="position">
        <span class="position-input">摄像头位置</span>
        <div>
          <el-input style="width: 250px; margin-right: 20px;"></el-input>
          <el-button>修改</el-button>
        </div>
      </div>
      <div class="heading">
        <span class="heading-slide">方向角</span>
        <el-slider v-model="headingAngle" />
      </div>
      <div class="pitch">
        <span class="pitch-slide">俯仰角</span>
        <el-slider v-model="pitchAngle" />
      </div>
      <div class="horizontal">
        <span class="horizontal-slide">水平视场角</span>
        <el-slider v-model="horizontalAngle" />
      </div>
      <div class="vertical">
        <span class="vertical-slide">垂直视场角</span>
        <el-slider v-model="verticalAngle" />
      </div>
      <div class="distance">
        <span class="distance-slide">投射距离</span>
        <el-slider v-model="projDistance" range :max="1000" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as Cesium from 'cesium'

onMounted(() => {
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0MGMyMWM0YS1lNDEyLTRjNWYtYTY3OS1jOTZkOWM1OThjYTEiLCJpZCI6MTkxMTMxLCJpYXQiOjE3MDU5MDY1ODN9.Tq3eObtuZJiqt4rDl-srQkMfz-WP9_EvKEPa_UvOI5s'

  const viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: true,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    terrainProvider: Cesium.createWorldTerrain()
  })
  viewer._cesiumWidget._creditContainer.style.display = 'none'
  viewer.clock.shouldAnimate = true
  viewer.scene.globe.depthTestAgainstTerrain = true

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(118.166, 30.143, 900),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    }
  })
})
</script>

<style scoped lang="scss">
#cesiumContainer {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.control-panel {
  position: absolute;
  top: 30px;
  left: 30px;
  width: 400px;
  height: fit-content;
  z-index: 999;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);

  .inner {
    padding: 10px 20px;

    .title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 10px;
    }
  }
}
</style>
