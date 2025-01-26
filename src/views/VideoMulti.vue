<template>
  <div id="cesiumContainer"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as Cesium from 'cesium'
import Hls from 'hls.js'
import { createVideo3D } from '@/utils/addMultiVideo'

let viewer = null

// 显示信息的函数
function showPopupInfo(position) {
  let infoBox = document.getElementById('infoBox')
  if (!infoBox) {
    infoBox = document.createElement('div')
    infoBox.id = 'infoBox'
    infoBox.style.position = 'absolute'
    infoBox.style.top = '10px'
    infoBox.style.right = '10px'
    infoBox.style.padding = '10px'
    infoBox.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
    infoBox.style.color = 'white'
    infoBox.style.borderRadius = '5px'
    document.body.appendChild(infoBox)
  }

  infoBox.innerHTML = '这是一个摄像头'
  infoBox.style.display = 'block'
}

// 隐藏信息的函数
function hidePopupInfo() {
  const infoBox = document.getElementById('infoBox')
  if (infoBox) {
    infoBox.style.display = 'none' // 隐藏信息框
  }
}


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

  // 创建视频元素
  let videoEle = document.createElement('video')
  videoEle.setAttribute('muted', true)
  videoEle.setAttribute('loop', true)
  videoEle.setAttribute('autoplay', true)
  document.body.appendChild(videoEle)
  // videoEle.setAttribute('src', '/lukou.mp4')
  videoEle.style.cssText = 'position:absolute;left:0px;top:0px;width:320px;height:240px;display:none'

  if (Hls.isSupported()) {
    const hls = new Hls()
    hls.loadSource('http://hls01open.ys7.com/openlive/78e31911faee4c9382a669542f7fe9f0.m3u8')
    hls.attachMedia(videoEle)
    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      videoEle.play().then(() => {
        console.log('Video playing')
      })
    })
  } else if (videoEle.canPlayType('application/vnd.apple.mpegurl')) {
    videoEle.src = 'http://hls01open.ys7.com/openlive/78e31911faee4c9382a669542f7fe9f0.m3u8'
    videoEle.addEventListener('loadedmetadata', function () {
      videoEle.play().then(() => {
        console.log('Video playing')
      })
    })
  }

  // 视频加载完成后创建 3D 视频对象
  videoEle.addEventListener('loadeddata', () => {
    let p = [121.11124, 31.14121, 100.49794]
    let stanceOption = {
      heading: 106.9,
      pitch: -72.3,
      roll: 0,
      fov: 28.9,
      aspectRatio: 2.1,
      distance: 1000,
      frustumShow: true
    }  // 探头姿态
    let p1 = Cesium.Cartesian3.fromDegrees(p[0] - 0.001, p[1], p[2])
    createVideo3D(p1, viewer, videoEle, 'camera1', stanceOption)
    let p2 = Cesium.Cartesian3.fromDegrees(p[0] + 0.001, p[1], p[2])
    createVideo3D(p2, viewer, videoEle, 'camera2', stanceOption)
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

  viewer.scene.canvas.addEventListener('click', (event) => {
    // 获取鼠标点击位置
    const screenPosition = new Cesium.Cartesian2(event.clientX, event.clientY)

    // 从屏幕坐标拾取场景对象
    const pickedObject = viewer.scene.pick(screenPosition)
    if (Cesium.defined(pickedObject)) {
      // 检查是否点击到了 DebugCameraPrimitive（frustum）
      if (pickedObject.primitive instanceof Cesium.DebugCameraPrimitive) {
        const id = pickedObject.primitive.id
        console.log("DebugCameraPrimitive id:", id)
        showPopupInfo(screenPosition)
      } else {
        hidePopupInfo()
      }
    } else {
      // 如果没有拾取到任何对象，隐藏信息框
      hidePopupInfo()
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
</style>
