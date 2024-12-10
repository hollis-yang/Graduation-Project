<template>
  <div id="cesiumContainer"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as Cesium from 'cesium'

onMounted(async () => {
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
    terrainProvider: Cesium.createWorldTerrain(),
  })

  viewer._cesiumWidget._creditContainer.style.display = 'none'
  viewer.clock.shouldAnimate = true
  viewer.scene.globe.depthTestAgainstTerrain = true

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(117.205457, 31.842984, 200),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
  })

  // 定义点
  const points = [
    { longitude: 117.20546165023242, latitude: 31.842979711543542, height: 63.00075249310095 },
    { longitude: 117.21010767192992, latitude: 31.838694850710993, height: -835.3145659660477 }
  ]

  // 将点转换为 Cartesian3
  const positions = points.map(point => Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, point.height))

  // 使用原始坐标向场景中添加线段
  viewer.entities.add({
    polyline: {
      positions: positions,
      width: 5,
      material: Cesium.Color.RED,
    }
  })

  // 计算两个点之间的距离（以米为单位）的函数
  const calculateDistance = (start, end) => {
    const startCartographic = Cesium.Cartographic.fromDegrees(start.longitude, start.latitude)
    const endCartographic = Cesium.Cartographic.fromDegrees(end.longitude, end.latitude)
    return Cesium.Cartesian3.distance(
      Cesium.Cartesian3.fromRadians(startCartographic.longitude, startCartographic.latitude, start.height),
      Cesium.Cartesian3.fromRadians(endCartographic.longitude, endCartographic.latitude, end.height)
    )
  }

  // 计算起点和终点之间的距离
  const distance = calculateDistance(points[0], points[1])

  // 根据距离确定点的数量（每5米一个点）
  const numInterpolationPoints = Math.ceil(distance / 5)

  // 在起点和终点之间插值点的函数，用于地形采样
  const interpolatePoints = (start, end, numPoints) => {
    const points = []
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints
      const longitude = Cesium.Math.lerp(start.longitude, end.longitude, t)
      const latitude = Cesium.Math.lerp(start.latitude, end.latitude, t)
      const height = Cesium.Math.lerp(start.height, end.height, t)
      points.push({ longitude, latitude, height })
    }
    return points
  }

  // 插值点
  const interpolatedPoints = interpolatePoints(points[0], points[1], numInterpolationPoints)

  // 将点转换为 Cartographic 用于地形采样
  const cartographics = interpolatedPoints.map(point => new Cesium.Cartographic(
    Cesium.Math.toRadians(point.longitude),
    Cesium.Math.toRadians(point.latitude),
    point.height
  ))

  // 进行地形采样
  const terrainProvider = viewer.terrainProvider
  const sampledTerrain = await Cesium.sampleTerrainMostDetailed(terrainProvider, cartographics)

  // 寻找交点
  let intersectionPoint = null
  for (let i = 0; i < sampledTerrain.length; i++) {
    const sample = sampledTerrain[i]
    if (sample.height > interpolatedPoints[i].height) {
      intersectionPoint = sample
      break
    }
  }

  // 将交点添加到场景中
  if (intersectionPoint) {
    viewer.entities.add({
      position: Cesium.Cartesian3.fromRadians(intersectionPoint.longitude, intersectionPoint.latitude, intersectionPoint.height),
      point: {
        pixelSize: 10,
        color: Cesium.Color.BLUE,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
    })
  }
})
</script>

<style scoped lang="scss">
#cesiumContainer {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
