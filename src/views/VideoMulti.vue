<template>
  <div id="cesiumContainer"></div>
  <div class="info-box">
    <!-- 视锥体显示 -->
    <div class="slider-demo-block">
      <div class="demonstration">视锥体显示</div>
      <el-switch
        v-model="frustumShow"
        active-color="#13ce66"
        inactive-color="#ffffff"
        active-text="开"
        inactive-text="关"
        class="slider"></el-switch>
    </div>
    <div class="inner" v-show="showInfoBox">
      <!-- id -->
      <div class="slider-demo-block">
        <div class="demonstration">摄像头ID</div>
        <div class="slider">{{ infoContent.id }}</div>
      </div>
      <!-- 姿态参数 -->
      <div v-for="(value, key) in infoList" class="slider-demo-block">
        <div class="demonstration">{{ key }}</div>
        <el-slider
          v-model="infoContent[key]"
          show-input
          size="small"
          :min="value[0]"
          :max="value[1]"
          :step="value[2]"
          class="slider"></el-slider>
      </div>
      <!-- 复原与确认按钮 -->
      <div class="ctl-btn" style="margin: 8px 0 8px 0;">
        <el-button type="primary">复原</el-button>
        <el-button type="primary">更新</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import * as Cesium from 'cesium'
import Hls from 'hls.js'
import { createVideo3D } from '@/utils/addMultiVideo'
import { toggleDebugCameraPrimitives } from '@/utils/updateMultiVideo'

let viewer = null
const showInfoBox = ref(false)
const frustumShow = ref(false)
const infoList = {
  heading: [0, 360, 1],
  pitch: [-180, 180, 1],
  roll: [-180, 180, 1],
  fov: [1, 90, 1],
  aspectRatio: [0.1, 5, 0.1],
  distance: [1, 2000, 1],
}
const infoContent = ref({
  id: '',
  heading: 0,
  pitch: 0,
  roll: 0,
  fov: 0,
  aspectRatio: 0,
  distance: 0,
})

const cameraList = ref([
  {
    id: 'camera1',
    position: [121.11124-0.001, 31.14121, 100.49794],
    stanceOption: {
      id: 'camera1',
      heading: 106.9,
      pitch: -72.3,
      roll: 0,
      fov: 28.9,
      aspectRatio: 2.1,
      distance: 1000,
    },
    videoUrl: '/lukou.mp4'
  },
  {
    id: 'camera2',
    position: [121.11124+0.001, 31.14121, 100.49794],
    stanceOption: {
      id: 'camera2',
      heading: 106.9,
      pitch: -72.3,
      roll: 0,
      fov: 40,
      aspectRatio: 3,
      distance: 1000,
    },
    videoUrl: '/lukou.mp4'
  },
  {
    id: 'camera3',
    position: [121.11124+0.002, 31.14121, 100.49794],
    stanceOption: {
      id: 'camera3',
      heading: 200,
      pitch: -72.3,
      roll: 0,
      fov: 40,
      aspectRatio: 3,
      distance: 1000,
    },
    videoUrl: '/lukou.mp4'
  }
])

// 显示信息的函数
function showPopupInfo(id) {
  // 根据id获取摄像头信息
  const camera = cameraList.value.find(camera => camera.id === id)
  if (camera) {
    showInfoBox.value = true
    infoContent.value = cameraList.value.find(camera => camera.id === id).stanceOption
  }
}

/**
 * 监听是否显示视锥体
 */
watch(() => frustumShow.value, (newVal) => {
  toggleDebugCameraPrimitives(viewer, newVal)

  if (!newVal) {
    showInfoBox.value = false
  }
})



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
  // viewer.imageryLayers.addImageryProvider(tdtAnnoLayer)


  /**
   * 遍历cameraList添加视频
   */
  cameraList.value.forEach(camera => {
    // 创建视频元素
    let videoEle = document.createElement('video')
    videoEle.setAttribute('muted', true)
    videoEle.setAttribute('loop', true)
    videoEle.setAttribute('autoplay', true)
    document.body.appendChild(videoEle)
    videoEle.style.cssText = 'position:absolute;left:0px;top:0px;width:320px;height:240px;display:none'
    videoEle.setAttribute("src", "/lukou.mp4")

    // 使用hls.js播放视频
    // if (Hls.isSupported()) {
    //   const hls = new Hls()
    //   hls.loadSource(camera.videoUrl)
    //   hls.attachMedia(videoEle)
    //   hls.on(Hls.Events.MANIFEST_PARSED, function () {
    //     videoEle.play().then(() => {
    //       console.log('Video playing')
    //     })
    //   })
    // } else if (videoEle.canPlayType('application/vnd.apple.mpegurl')) {
    //   videoEle.src = camera.videoUrl
    //   videoEle.addEventListener('loadedmetadata', function () {
    //     videoEle.play().then(() => {
    //       console.log('Video playing')
    //     })
    //   })
    // }

    // 视频加载完成后创建 3D 视频对象
    videoEle.addEventListener('loadeddata', () => {
      let p = camera.position
      let p1 = Cesium.Cartesian3.fromDegrees(p[0], p[1], p[2])
      createVideo3D(p1, viewer, videoEle, camera.id, camera.stanceOption)
    })
  })


  // 飞到默认位置
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(121.11124, 31.14121, 100.49794),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
    duration: 1,
  })


  /**
   * 监听事件
   */
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
        showPopupInfo(id)
      } else {
        showInfoBox.value = false
      }
    } else {
      // 如果没有拾取到任何对象，隐藏信息框
      showInfoBox.value = false
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

.info-box {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 5px;
}

.slider-demo-block {
  width: 500px;
  display: flex;
  align-items: center;

  .slider {
    margin-top: 0;
    flex: 3.5;
  }

  .demonstration {
    font-size: 16px;
    color: white;
    line-height: 40px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 0;
  }
}
</style>
