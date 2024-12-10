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
        <el-slider v-model="pitchAngle" :max="180" :min="-180" />
      </div>
      <div class="horizontal">
        <span class="horizontal-slide">水平视场角</span>
        <el-slider v-model="horizontalAngle" :max="60" :min="1" />
      </div>
      <div class="vertical">
        <span class="vertical-slide">垂直视场角</span>
        <el-slider v-model="verticalAngle" :max="30" :min="10" />
      </div>
      <div class="distance">
        <span class="distance-slide">投射距离</span>
        <el-slider v-model="projDistance" range :max="1000" :min="1" />
      </div>
      <el-button @click="addFrustum">添加视锥体</el-button>
      <el-button @click="deleteFrustum">删除视锥体</el-button>
      <!-- <el-button @click="getProjPolygon">获取融合范围</el-button> -->
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer

const camPosition = ref('117.205457,31.842984,63.9')
const headingAngle = ref(88.5)
const pitchAngle = ref(-49.5)
const horizontalAngle = ref(46.3)
const verticalAngle = ref(15.5)
const projDistance = ref([0.01, 1000])

// 存储视锥体的ID
let frustumIds = []
// 存储视锥线坐标
let frustumLineCoords = []
// 存储视锥体primitive
let frustumPrimitive

// 添加线
function addLine(camPosition) {
  // 删除上一次
  const prevLine = viewer.entities.getById('line')
  if (prevLine) {
    viewer.entities.remove(prevLine)
  }
  frustumLineCoords = []

  // 提取参数
  const [lon, lat, additionalHeight] = camPosition.split(',').map(Number)
  const heading = Cesium.Math.toRadians(headingAngle.value)
  const pitch = Cesium.Math.toRadians(pitchAngle.value)

  // 使用直接提供的高度
  const height = additionalHeight

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
      material: Cesium.Color.BLUE,
    }
  })
  viewer.zoomTo(viewer.entities)
}

// 添加视锥体
function addFrustum() {
  // 删除上一个视锥体
  deleteFrustum()

  const [lon, lat, additionalHeight] = camPosition.value.split(',').map(Number)

  // 使用直接提供的高度
  const height = additionalHeight

  // 创建视锥体
  const frustum = new Cesium.PerspectiveFrustum({
    fov: Cesium.Math.toRadians(horizontalAngle.value), // 水平视场角
    aspectRatio: 1 / 2, // 宽高比
    near: projDistance.value[0],
    far: projDistance.value[1]
  })

  // 计算位置和方向
  const position = Cesium.Cartesian3.fromDegrees(lon, lat, height)
  const heading = Cesium.Math.toRadians(headingAngle.value)
  const pitch = Cesium.Math.toRadians(pitchAngle.value)
  const adjustedPitch = pitch - Cesium.Math.toRadians(90) // 偏移90度
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(
    position,
    new Cesium.HeadingPitchRoll(heading, adjustedPitch, 0)
  )

  // 填充视锥体
  const geometry1 = new Cesium.FrustumGeometry({
    frustum: frustum,
    origin: position,
    orientation: orientation,
    vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
  })

  const instance = new Cesium.GeometryInstance({
    geometry: geometry1,
    id: 'frustumGeometry',
    attributes: {
      color: Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(1.0, 0.0, 0.0, 0.2)),
    },
  })

  frustumPrimitive = new Cesium.Primitive({
    geometryInstances: [instance],
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
      flat: true,
    }),
    asynchronous: false,
    id: 'frustum' // 设置id
  })

  viewer.scene.primitives.add(frustumPrimitive)

  // 添加视锥线
  const frustumOutline = new Cesium.FrustumOutlineGeometry({
    frustum: frustum,
    origin: position,
    orientation: orientation,
  })

  const geometry2 = Cesium.FrustumOutlineGeometry.createGeometry(frustumOutline)
  const positions = geometry2.attributes.position.values
  const indices = geometry2.indices

  // 计算每条线的顶点坐标并添加到地图中
  for (let i = 0; i < indices.length; i += 2) {
    const startIndex = indices[i] * 3
    const endIndex = indices[i + 1] * 3

    const start = new Cesium.Cartesian3(positions[startIndex], positions[startIndex + 1], positions[startIndex + 2])
    const end = new Cesium.Cartesian3(positions[endIndex], positions[endIndex + 1], positions[endIndex + 2])

    const id = `frustum_line_${i / 2}`
    frustumIds.push(id)

    // 将 Cartesian3 转换为 Cartographic (经纬度和高程)
    const startCartographic = Cesium.Cartographic.fromCartesian(start)
    const endCartographic = Cesium.Cartographic.fromCartesian(end)

    // 将弧度转换为度数
    const startLongitude = Cesium.Math.toDegrees(startCartographic.longitude)
    const startLatitude = Cesium.Math.toDegrees(startCartographic.latitude)
    const startHeight = startCartographic.height

    const endLongitude = Cesium.Math.toDegrees(endCartographic.longitude)
    const endLatitude = Cesium.Math.toDegrees(endCartographic.latitude)
    const endHeight = endCartographic.height

    frustumLineCoords.push([
      { longitude: startLongitude, latitude: startLatitude, height: startHeight },
      { longitude: endLongitude, latitude: endLatitude, height: endHeight }
    ])

    viewer.entities.add({
      id: id,
      polyline: {
        positions: [start, end],
        width: 5,
        material: Cesium.Color.RED,
      },
    })
  }

  console.log(frustumLineCoords)
  viewer.zoomTo(viewer.entities)

}

// 删除视锥体
function deleteFrustum() {
  // 删除primitive
  if (frustumPrimitive) {
    viewer.scene.primitives.remove(frustumPrimitive)
  }

  // 删除所有的frustum_lines
  frustumIds.forEach(id => {
    const entity = viewer.entities.getById(id)
    if (entity) {
      viewer.entities.remove(entity)
    }
  })

  // 清空ID列表
  frustumIds = []
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
    destination: Cesium.Cartesian3.fromDegrees(117.205457, 31.842984, 200),
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
