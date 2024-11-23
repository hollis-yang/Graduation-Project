<template>
  <div id="cesiumContainer"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as Cesium from 'cesium'

onMounted(() => {
  // 设置Cesium Ion的默认访问令牌
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0MGMyMWM0YS1lNDEyLTRjNWYtYTY3OS1jOTZkOWM1OThjYTEiLCJpZCI6MTkxMTMxLCJpYXQiOjE3MDU5MDY1ODN9.Tq3eObtuZJiqt4rDl-srQkMfz-WP9_EvKEPa_UvOI5s'

  // 初始化Cesium Viewer
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
  
  // 隐藏Cesium的版权信息
  viewer._cesiumWidget._creditContainer.style.display = 'none'
  viewer.clock.shouldAnimate = true

  // 添加天地图影像图层
  const webKey = '7b13a4031f051b6317cdcca67ae391f1'
  viewer.imageryLayers.addImageryProvider(
    new Cesium.WebMapTileServiceImageryProvider({
      url: 'http://t0.tianditu.com/cia_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cia&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default.jpg&tk=' + webKey,
      layer: 'tdtAnnoLayer',
      style: 'default',
      format: 'image/jpeg',
      tileMatrixSetID: 'GoogleMapsCompatible',
      show: false,
    })
  )

  // 设置默认视角
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(117.205457, 31.842984, 63.9),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    }
  })

  // 创建视频元素
  const videoElement = document.createElement('video')
  videoElement.src = './lukou.mp4'
  videoElement.setAttribute('muted', 'muted')
  videoElement.setAttribute('autoplay', 'autoplay')
  videoElement.setAttribute('loop', 'loop')
  videoElement.style.display = 'none'
  document.body.appendChild(videoElement)

  // 等待视频加载完成后添加到Cesium场景
  videoElement.addEventListener('loadeddata', function() {
    // 创建视频材质
    const videoMaterial = new Cesium.ImageMaterialProperty({
      image: videoElement,
      transparent: true
    })

    // 添加带有视频材质的平面到场景中
    viewer.entities.add({
      name: 'Video Plane',
      position: Cesium.Cartesian3.fromDegrees(117.205457, 31.842984, 63.9),
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(117.205457 - 0.001, 31.842984 - 0.001, 117.205457 + 0.001, 31.842984 + 0.001),
        material: videoMaterial
      }
    })

    // 创建线段表示视锥体
    const frustumLines = []

    function createLine(start, end) {
      return viewer.entities.add({
        polyline: {
          positions: [start, end],
          width: 2,
          material: Cesium.Color.WHITE
        }
      })
    }

    const origin = Cesium.Cartesian3.fromDegrees(117.205457, 31.842984, 63.9)
    const offset = 0.001

    const points = [
      Cesium.Cartesian3.fromDegrees(117.205457 - offset, 31.842984 - offset, 0),
      Cesium.Cartesian3.fromDegrees(117.205457 + offset, 31.842984 - offset, 0),
      Cesium.Cartesian3.fromDegrees(117.205457 + offset, 31.842984 + offset, 0),
      Cesium.Cartesian3.fromDegrees(117.205457 - offset, 31.842984 + offset, 0)
    ]

    for (const point of points) {
      frustumLines.push(createLine(origin, point))
    }

    let frustumVisible = true

    function toggleFrustum() {
      frustumVisible = !frustumVisible
      frustumLines.forEach(line => {
        line.show = frustumVisible
      })
    }

    // 添加控制视锥体显隐的按钮
    const toggleFrustumButton = document.createElement('button')
    toggleFrustumButton.innerHTML = 'Toggle Frustum'
    toggleFrustumButton.style.position = 'absolute'
    toggleFrustumButton.style.top = '10px'
    toggleFrustumButton.style.left = '110px'
    toggleFrustumButton.onclick = toggleFrustum
    document.body.appendChild(toggleFrustumButton)
  })

  // 控制视频播放和暂停
  function playVideo() {
    videoElement.play()
  }

  function pauseVideo() {
    videoElement.pause()
  }

  // 添加全局样式控制视频播放和暂停的按钮
  const playButton = document.createElement('button')
  playButton.innerHTML = 'Play'
  playButton.style.position = 'absolute'
  playButton.style.top = '10px'
  playButton.style.left = '10px'
  playButton.onclick = playVideo
  document.body.appendChild(playButton)

  const pauseButton = document.createElement('button')
  pauseButton.innerHTML = 'Pause'
  pauseButton.style.position = 'absolute'
  pauseButton.style.top = '10px'
  pauseButton.style.left = '60px'
  pauseButton.onclick = pauseVideo
  document.body.appendChild(pauseButton)
})
</script>

<style scoped>
#cesiumContainer {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

button {
  z-index: 1000; /* 确保按钮在Cesium Canvas上显示 */
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 5px 10px;
  cursor: pointer;
}
</style>
