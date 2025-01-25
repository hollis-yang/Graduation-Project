<template>
  <div id="cesiumContainer"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as Cesium from 'cesium'
import mitt from 'mitt'
import { createVideo3D } from '@/utils/addMultiVideo'

const eventBus = mitt()
let viewer = null

onMounted(() => {
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0MGMyMWM0YS1lNDEyLTRjNWYtYTY3OS1jOTZkOWM1OThjYTEiLCJpZCI6MTkxMTMxLCJpYXQiOjE3MDU5MDY1ODN9.Tq3eObtuZJiqt4rDl-srQkMfz-WP9_EvKEPa_UvOI5s'

  // 初始化 Cesium Viewer
  viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    terrainProvider: Cesium.createWorldTerrain()
  })
  viewer._cesiumWidget._creditContainer.style.display = 'none'
  viewer.clock.shouldAnimate = true
  viewer.scene.globe.depthTestAgainstTerrain = true

  // 添加影像图层
  const tdtAnnoLayer = new Cesium.WebMapTileServiceImageryProvider({
    url: 'http://t0.tianditu.com/cia_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cia&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default.jpg&tk=7b13a4031f051b6317cdcca67ae391f1',
    layer: 'tdtAnnoLayer',
    style: 'default',
    format: 'image/jpeg',
    tileMatrixSetID: 'GoogleMapsCompatible',
    show: false,
  })
  viewer.imageryLayers.addImageryProvider(tdtAnnoLayer)

  eventBus.emit('viewer-ready', viewer)
})

// 监听 viewer-ready 事件
eventBus.on('viewer-ready', (viewer) => {
  // 创建视频元素
  let videoEle = document.createElement('video')
  videoEle.setAttribute('muted', true)
  videoEle.setAttribute('loop', true)
  videoEle.setAttribute('autoplay', true)
  document.body.appendChild(videoEle)
  videoEle.setAttribute('src', '/lukou.mp4')
  videoEle.style.cssText = 'position:absolute;left:0px;top:0px;width:320px;height:240px;display:none'

  // 视频加载完成后创建 3D 视频对象
  videoEle.addEventListener('loadeddata', () => {
    let p = [121.11124, 31.14121, 100.49794]
    let p1 = Cesium.Cartesian3.fromDegrees(p[0] - 0.001, p[1], p[2])
    createVideo3D(p1, viewer, videoEle)
    let p2 = Cesium.Cartesian3.fromDegrees(p[0] + 0.001, p[1], p[2])
    createVideo3D(p2, viewer, videoEle)
  })

  // 飞到指定位置
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(121.11124, 31.14121, 100.49794),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
    duration: 1,
  })
})
</script>

<style scoped lang="scss">
#cesiumContainer {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
</style>
