<script setup>
import * as Cesium from 'cesium'
import { onMounted } from 'vue'

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
  })

  viewer.terrainProvider = Cesium.createWorldTerrain()

  // 加载天地图
  const webKey = '7b13a4031f051b6317cdcca67ae391f1'
  viewer.imageryLayers.addImageryProvider(
    new Cesium.WebMapTileServiceImageryProvider({
      // 影像
      url: 'http://t0.tianditu.com/cia_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cia&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default.jpg&tk=' + webKey,
      // 矢量
      // url: 'http://t0.tianditu.com/vec_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=vec&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=' + webKey,
      layer: 'tdtAnnoLayer',
      style: 'default',
      format: 'image/jpeg',
      tileMatrixSetID: 'GoogleMapsCompatible',
      show: false,
    })
  )

  viewer._cesiumWidget._creditContainer.style.display = 'none'
  viewer.clock.shouldAnimate = true

  // 默认视角
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(121.228660, 31.271975, 5000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    }
  })


  // 加载gltf
  // 指定模型加载的位置
  const position = Cesium.Cartesian3.fromDegrees(121.228660, 31.271975, 0)

  // 指定视角观察的方向
  const heading = Cesium.Math.toRadians(90)
  const pitch = Cesium.Math.toRadians(-5)
  const roll = 0
  const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll)
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(
    position,
    hpr
  )

  // 加载模型
  const entity = viewer.entities.add({
    name: 'gltf',
    position: position,
    orientation: orientation,
    model: {
      uri: '/model.gltf',
      scale: 0.92
    },
  })
  // 白光增强30倍
  entity.model.lightColor = new Cesium.Cartesian3(30.0, 30.0, 30.0)


  // 加载truck.gltf并使其移动
  const truckPosition = new Cesium.SampledPositionProperty()

  // 一个模拟的经纬度路径数组
  const path = []
  for (let i = 0; i < 13; i++) {
    const longitude = 121.227960 + i * 0.0001
    const latitude = 31.271885 + i * 0.0000015
    const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, 0)
    path.push(position)

    // 一秒变化一次
    const time = Cesium.JulianDate.addSeconds(
      viewer.clock.startTime,
      i,
      new Cesium.JulianDate()
    )

    truckPosition.addSample(time, position)
  }


  // 以entity方式加载truck
  const truckEntity = viewer.entities.add({
    name: 'truck',
    position: truckPosition,
    orientation: orientation,
    model: {
      uri: '/cars/truck.gltf',
      scale: 1,
    },
  })
  
  // // 视角切换到truck
  // viewer.trackedEntity = truckEntity
})
</script>

<template>
  <div id="cesiumContainer">
  </div>
</template>

<style scoped>
#cesiumContainer {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
</style>
