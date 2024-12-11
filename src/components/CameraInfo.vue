<template>
  <div class="container">
    <div>经度：{{ longitude.toFixed(6) }}</div>
    <div>纬度：{{ latitude.toFixed(6) }}</div>
    <div>海拔：{{ altitude.toFixed(2) }} m</div>
    <div>方向：{{ heading.toFixed(2) }}°</div>
    <div>俯仰角：{{ pitch.toFixed(2) }}°</div>
    <div>视高：{{ eyeHeight.toFixed(2) }} m</div>
  </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted } from 'vue'
import * as Cesium from 'cesium'

const props = defineProps(['viewer'])

// 定义状态栏数据
const longitude = ref(0)
const latitude = ref(0)
const altitude = ref(0)
const heading = ref(0)
const pitch = ref(0)
const eyeHeight = ref(0)

const updateStatusBar = () => {
  if (!props.viewer) {
    return
  }

  const camera = props.viewer.camera

  // 获取相机姿态
  heading.value = Cesium.Math.toDegrees(camera.heading) || 0
  pitch.value = Cesium.Math.toDegrees(camera.pitch) || 0
  eyeHeight.value = camera.positionCartographic.height || 0
}

const updateMousePosition = (movement) => {
  if (!props.viewer) {
    return
  }

  const scene = props.viewer.scene
  const ellipsoid = scene.globe.ellipsoid

  // 使用 pickPosition 获取鼠标位置
  const cartesian = scene.pickPosition(movement.endPosition)
  if (Cesium.defined(cartesian)) {
    const cartographic = ellipsoid.cartesianToCartographic(cartesian)

    longitude.value = Cesium.Math.toDegrees(cartographic.longitude) || 0
    latitude.value = Cesium.Math.toDegrees(cartographic.latitude) || 0
    altitude.value = cartographic.height || 0
  }
}

// 初始化状态栏
onMounted(() => {
  if (props.viewer) {
    // 添加事件监听器
    props.viewer.camera.changed.addEventListener(updateStatusBar)
    props.viewer.screenSpaceEventHandler.setInputAction(updateMousePosition, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // 初始更新
    updateStatusBar()
  } else {
    console.error('Viewer is not defined')
  }
})

onUnmounted(() => {
  if (props.viewer) {
    props.viewer.camera.changed.removeEventListener(updateStatusBar)
    props.viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  }
})
</script>

<style scoped lang="scss">
.container {
  margin-left: 50%;
  display: flex;
  justify-content: center;
  align-items: center;

  // 所有子div显示width
  div {
    height: 100%;
    text-align: center;
    margin-left: 15px;
  }
}
</style>
