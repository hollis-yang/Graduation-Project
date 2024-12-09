<template>
  <div id="cesiumContainer"></div>
  <div class="control-panel">
    <div class="inner">
      <div class="title">参数控制</div>
      <div class="position">
        <span class="position-input">摄像头位置与方向</span>
        <div>
          <el-input
            style="width: 250px; margin-right: 20px;"
            v-model="camPosition"></el-input>
          <el-button @click="addLine(camPosition)">修改</el-button>
        </div>
      </div>
      <div class="heading">
        <span class="heading-slide">方向角</span>
        <el-slider v-model="headingAngle" :max="360" :min="0" />
      </div>
      <div class="pitch">
        <span class="pitch-slide">俯仰角</span>
        <el-slider v-model="pitchAngle" :max="90" :min="-90" />
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
import { onMounted, ref } from 'vue'
import * as Cesium from 'cesium'
import 'element-plus/dist/index.css'
import { ElInput, ElButton, ElSlider } from 'element-plus'

let viewer

const camPosition = ref('117.205457,31.842984,63.9')
const headingAngle = ref(88.5)
const pitchAngle = ref(-49.5)
const horizontalAngle = ref(30)
const verticalAngle = ref(30)
const projDistance = ref([0, 1000])

// 添加线
function addLine(camPosition) {
  // 删除上一次
  const prevLine = viewer.entities.getById('line')
  if (prevLine) {
    viewer.entities.remove(prevLine)
  }

  // 提取参数
  const [lon, lat, additionalHeight] = camPosition.split(',').map(Number)
  console.log(lon, lat, additionalHeight)
  const heading = Cesium.Math.toRadians(headingAngle.value)
  const pitch = Cesium.Math.toRadians(pitchAngle.value)

  // 高度采样
  const terrainProvider = viewer.terrainProvider
  const startPosition = [Cesium.Cartographic.fromDegrees(lon, lat)]

  Cesium.sampleTerrainMostDetailed(terrainProvider, startPosition).then((updatePosition) => {
    const terrainHeight = updatePosition[0].height
    const height = terrainHeight + additionalHeight

    // 方向向量
    const startCartesian = Cesium.Cartesian3.fromDegrees(lon, lat, height)
    const direction = new Cesium.Cartesian3()
    const matrix = Cesium.Transforms.headingPitchRollToFixedFrame(startCartesian, new Cesium.HeadingPitchRoll(heading, pitch, 0))
    Cesium.Matrix4.getRotation(matrix, new Cesium.Matrix3())
    Cesium.Cartesian3.fromElements(
      Cesium.Matrix4.getColumn(matrix, 0, new Cesium.Cartesian3()).x,
      Cesium.Matrix4.getColumn(matrix, 0, new Cesium.Cartesian3()).y,
      Cesium.Matrix4.getColumn(matrix, 0, new Cesium.Cartesian3()).z,
      direction
    )

    // 计算终点
    const endCartesian = Cesium.Cartesian3.add(startCartesian, Cesium.Cartesian3.multiplyByScalar(direction, 1000, new Cesium.Cartesian3()), new Cesium.Cartesian3())

    // 添加线实体
    viewer.entities.add({
      id: 'line',
      polyline: {
        positions: [startCartesian, endCartesian],
        width: 5,
        material: Cesium.Color.RED,
      }
    })
    viewer.zoomTo(viewer.entities)
  })
}

onMounted(() => {
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0MGMyMWM0YS1lNDEyLTRjNWYtYTY3OS1jOTZkOWM1OThjYTEiLCJpZCI6MTkxMTMxLCJpYXQiOjE3MDU5MDY1ODN9.Tq3eObtuZJiqt4rDl-srQkMfz-WP9_EvKEPa_UvOI5s'

  viewer = new Cesium.Viewer('cesiumContainer', {
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
