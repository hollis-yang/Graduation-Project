<template>
  <div id="cesiumContainer"></div>
  <button style="position: absolute; top: 10px; left: 10px;" @click="playVideo">
    Play
  </button>
  <button
    style="position: absolute; top: 10px; left: 70px;"
    @click="pauseVideo">
    Pause
  </button>
  <button
    style="position: absolute; top: 50px; left: 10px;"
    @click="addCamera([118.166, 30.143, 300], [75, 55, 200, 45, -10])">
    Add Camera
  </button>
  <button
    style="position: absolute; top: 10px; left: 150px;"
    @click="toggleFrustum">
    Toggle Frustum
  </button>
</template>

<script setup>
import { onMounted } from 'vue'
import * as Cesium from 'cesium'
import { getCameraProjection } from './utils/camera'
import { ViewAnalysis } from './assets/ViewAnalysis'

let viewer
let videoElement
let frustumLines = []

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

// async function addCamera(position, settings) {
//   try {
//     const terrainSamplePositions = [Cesium.Cartographic.fromDegrees(position[0], position[1])]
//     const updatedPositions = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, terrainSamplePositions)
//     const baseHeight = updatedPositions[0].height

//     const cameraPosition = Cesium.Cartesian3.fromDegrees(position[0], position[1], baseHeight + position[2])

//     // 添加摄像头线条，从地形开始并加上偏移高度
//     const cameraLineStart = Cesium.Cartesian3.fromDegrees(position[0], position[1], baseHeight)
//     const cameraLine = viewer.entities.add({
//       name: 'Camera Line',
//       polyline: {
//         positions: [cameraLineStart, cameraPosition],
//         width: 5,
//         material: Cesium.Color.RED
//       }
//     })

//     videoElement = document.createElement('video')
//     // videoElement.src = './lukou.mp4'
//     videoElement.src = 'http://hls01open.ys7.com/openlive/50c94278dd444de194c8f9251b4db27e.m3u8'
//     videoElement.setAttribute('muted', 'muted')
//     videoElement.setAttribute('autoplay', 'autoplay')
//     videoElement.setAttribute('loop', 'loop')
//     videoElement.style.display = 'none'
//     document.body.appendChild(videoElement)

//     videoElement.addEventListener('error', function (event) {
//       console.error('Video error:', event)
//       alert('视频加载错误，请检查视频路径和服务器配置')
//     })

//     videoElement.addEventListener('loadeddata', function () {
//       console.log('Video loaded, ready to play:', videoElement)
//       videoElement.play().then(() => {
//         console.log('Video playing')
//       }).catch(error => {
//         console.error('Video play error:', error)
//       })

//       const videoMaterial = new Cesium.ImageMaterialProperty({
//         image: videoElement,
//         transparent: true,
//       })

//       const trapezoidCoordinates = getCameraProjection([position[0], position[1], baseHeight], settings)

//       viewer.entities.add({
//         name: 'Video Trapezoid',
//         position: cameraPosition,
//         polygon: {
//           hierarchy: Cesium.Cartesian3.fromDegreesArray(trapezoidCoordinates.flat()),
//           material: videoMaterial
//         }
//       })

//       createFrustrum(cameraPosition, trapezoidCoordinates)

//       // addMask(cameraPosition)
//     })
//   } catch (error) {
//     console.error('Error accessing terrain data:', error)
//   }
// }

import Hls from 'hls.js'

async function addCamera(position, settings) {
  try {
    const terrainSamplePositions = [Cesium.Cartographic.fromDegrees(position[0], position[1])]
    const updatedPositions = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, terrainSamplePositions)
    const baseHeight = updatedPositions[0].height

    const cameraPosition = Cesium.Cartesian3.fromDegrees(position[0], position[1], baseHeight + position[2])

    const cameraLineStart = Cesium.Cartesian3.fromDegrees(position[0], position[1], baseHeight)
    const cameraLine = viewer.entities.add({
      name: 'Camera Line',
      polyline: {
        positions: [cameraLineStart, cameraPosition],
        width: 5,
        material: Cesium.Color.RED
      }
    })

    videoElement = document.createElement('video')
    videoElement.setAttribute('muted', 'muted')
    videoElement.setAttribute('autoplay', 'autoplay')
    videoElement.setAttribute('loop', 'loop')
    videoElement.style.display = 'none'
    document.body.appendChild(videoElement)

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource('http://hls01open.ys7.com/openlive/50c94278dd444de194c8f9251b4db27e.m3u8')
      hls.attachMedia(videoElement)
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        videoElement.play().then(() => {
          console.log('Video playing')
        }).catch(error => {
          console.error('Video play error:', error)
        })
      })
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = 'http://hls01open.ys7.com/openlive/50c94278dd444de194c8f9251b4db27e.m3u8'
      videoElement.addEventListener('loadedmetadata', function () {
        videoElement.play().then(() => {
          console.log('Video playing')
        }).catch(error => {
          console.error('Video play error:', error)
        })
      })
    } else {
      console.error('HLS.js is not supported in this browser.')
    }

    videoElement.addEventListener('error', function (event) {
      console.error('Video error:', event)
      alert('视频加载错误，请检查视频路径和服务器配置')
    })

    videoElement.addEventListener('loadeddata', function () {
      console.log('Video loaded, ready to play:', videoElement)

      const videoMaterial = new Cesium.ImageMaterialProperty({
        image: videoElement,
        transparent: true,
      })

      const trapezoidCoordinates = getCameraProjection([position[0], position[1], baseHeight], settings)

      viewer.entities.add({
        name: 'Video Trapezoid',
        position: cameraPosition,
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(trapezoidCoordinates.flat()),
          material: videoMaterial
        }
      })

      createFrustrum(cameraPosition, trapezoidCoordinates)

      // addMask(cameraPosition)
    })
  } catch (error) {
    console.error('Error accessing terrain data:', error)
  }
}

async function createFrustrum(position, points) {
  try {
    const cartographicPoints = points.map(point => Cesium.Cartographic.fromDegrees(point[0], point[1]))
    const updatedPositions = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartographicPoints)

    function createLine(start, end) {
      return viewer.entities.add({
        polyline: {
          positions: [start, end],
          width: 2,
          material: Cesium.Color.WHITE
        }
      })
    }

    for (const updatedPosition of updatedPositions) {
      const endPoint = Cesium.Cartesian3.fromRadians(updatedPosition.longitude, updatedPosition.latitude, updatedPosition.height)
      frustumLines.push(createLine(position, endPoint))
    }
  } catch (error) {
    console.error('Error accessing terrain data for frustum:', error)
  }
}

function toggleFrustum() {
  frustumLines.forEach(line => {
    line.show = !line.show
  })
}

function addMask(position) {
  const maskImage = new Image()
  maskImage.src = './video-mask.png'

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

    const videoMaterial = new Cesium.ImageMaterialProperty({
      image: canvas,
      transparent: true
    })

    viewer.entities.add({
      name: 'Video Plane',
      position: position,
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(118.166 - 0.0012, 30.143 - 0.0007, 118.166 + 0.0012, 30.143 + 0.0007),
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
    terrainProvider: Cesium.createWorldTerrain()
  })
  viewer._cesiumWidget._creditContainer.style.display = 'none'
  viewer.clock.shouldAnimate = true
  viewer.scene.globe.depthTestAgainstTerrain = true

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(118.166, 30.143, 500),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    }
  })

  // var tilesets = viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
  //   url: 'http://earthsdk.com/v/last/Apps/assets/dayanta/tileset.json'
  // }));
  // viewer.flyTo(tilesets)
  
  // ViewAnalysis.start(viewer)
  
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
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 5px 10px;
  cursor: pointer;
}
</style>
