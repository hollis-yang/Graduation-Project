<template>
  <div id="cesiumContainer"></div>
  <button style="position: absolute; top: 10px; left: 10px;" @click="playVideo">Play</button>
  <button style="position: absolute; top: 10px; left: 70px;" @click="pauseVideo">Pause</button>
  <button style="position: absolute; top: 50px; left: 10px;" @click="addCamera([117.205457, 31.842984, 30], [75, 55, 200, 45, -10])">Add
    Camera</button>
  <button style="position: absolute; top: 10px; left: 150px;" @click="toggleFrustum">Toggle Frustum</button>
</template>

<script setup>
import { onMounted } from 'vue'
import * as Cesium from 'cesium'
import { getCameraProjection } from './utils/camera'


let viewer
let videoElement
let frustumLines = []

// 控制视频播放和暂停
function playVideo() {
  videoElement.play().then(() => {
    console.log('Video playing')
  }).catch(error => {
    console.error('Video play error:', error)
  })
}
function pauseVideo() {
  videoElement.pause()
  console.log('Video paused')
}


// 指定位置添加监控
function addCamera(position, settings) {
  // 监控位置
  const cameraPosition = Cesium.Cartesian3.fromDegrees(position[0], position[1], position[2])

  // 创建视频元素
  videoElement = document.createElement('video')
  videoElement.src = './lukou.mp4'
  videoElement.setAttribute('muted', 'muted')
  videoElement.setAttribute('autoplay', 'autoplay')
  videoElement.setAttribute('loop', 'loop')
  videoElement.style.display = 'none'
  document.body.appendChild(videoElement)

  // 视频加载错误处理
  videoElement.addEventListener('error', function (event) {
    console.error('Video error:', event)
    alert('视频加载错误，请检查视频路径和服务器配置')
  })

  // 等待视频加载完成后添加到Cesium场景
  videoElement.addEventListener('loadeddata', function () {
    console.log('Video loaded, ready to play:', videoElement)

    // 确保视频播放
    videoElement.play().then(() => {
      console.log('Video playing')
    }).catch(error => {
      console.error('Video play error:', error)
    })

    // 创建视频材质
    const videoMaterial = new Cesium.ImageMaterialProperty({
      image: videoElement,
      transparent: true,
      // alpha: 0.5
    })

    // 定义梯形的顶点坐标
    const trapezoidCoordinates = getCameraProjection(position, settings)

    // 添加带有视频材质的梯形到场景中
    viewer.entities.add({
      name: 'Video Trapezoid',
      position: cameraPosition,
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(trapezoidCoordinates.flat()),
        material: videoMaterial
      }
    })

    // 创建线段表示视锥体
    frustumLines = []
    createFrustrum(cameraPosition, trapezoidCoordinates.map(coord => Cesium.Cartesian3.fromDegrees(coord[0], coord[1])))

    // 创建mask
    // addMask(cameraPosition)
  })
}


/**
 * 创建视锥体及显隐控制
 */
function createFrustrum(position, points) {
  function createLine(start, end) {
    return viewer.entities.add({
      polyline: {
        positions: [start, end],
        width: 2,
        material: Cesium.Color.WHITE
      }
    })
  }

  for (const point of points) {
    frustumLines.push(createLine(position, point))
  }
}
function toggleFrustum() {
  frustumLines.forEach(line => {
    line.show = !line.show
  })
}


function addMask(position) {
  // 创建遮罩Canvas
  const maskImage = new Image()
  maskImage.src = './video-mask.png' // 这里是你的羽化遮罩图片路径

  maskImage.onload = function () {
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight
    const ctx = canvas.getContext('2d')

    function updateCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'destination-in'
      ctx.drawImage(maskImage, 0, 0, canvas.width, canvas.height)
      requestAnimationFrame(updateCanvas)
    }

    updateCanvas()

    // 创建视频材质
    const videoMaterial = new Cesium.ImageMaterialProperty({
      image: canvas,
      transparent: true
    })

    // 添加带有视频材质的平面到场景中
    viewer.entities.add({
      name: 'Video Plane',
      position: position,
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(117.205457 - 0.0012, 31.842984 - 0.0007, 117.205457 + 0.0012, 31.842984 + 0.0007),
        material: videoMaterial
      }
    })
  }
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
  })
  viewer._cesiumWidget._creditContainer.style.display = 'none'
  viewer.clock.shouldAnimate = true

  // 默认视角
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(117.205457, 31.842984, 500),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    }
  })
})
</script>

<style scoped>
#cesiumContainer {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

button {
  z-index: 1000;
  /* 确保按钮在Cesium Canvas上显示 */
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 5px 10px;
  cursor: pointer;
}
</style>
