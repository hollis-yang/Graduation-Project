import * as Cesium from 'cesium'

// 插值获取视锥线与地表交点
export async function getIntersectPoint(coord, viewer) {
  // 将点转换为 Cartesian3
  const positions = coord.map(point => Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, point.height))

  // 计算两个点之间的距离(m)
  const distance = calculateDistance(coord[0], coord[1])
  // 根据距离确定点的数量（每2米一个点）
  const numInterpolationPoints = Math.ceil(distance / 1)
  // 生成插值点
  const interpolatedPoints = interpolatePoints(coord[0], coord[1], numInterpolationPoints)
  // 将点转换为 Cartographic 用于地形采样
  const cartographics = interpolatedPoints.map(point => new Cesium.Cartographic(
    Cesium.Math.toRadians(point.longitude),
    Cesium.Math.toRadians(point.latitude),
    point.height
  ))

  // 高程采样
  const terrainProvider = viewer.terrainProvider
  const sampledTerrain = await Cesium.sampleTerrainMostDetailed(terrainProvider, cartographics)
  // 寻找交点
  let intersectionPoint = null
  for (let i = 0; i < sampledTerrain.length; i++) {
    const sample = sampledTerrain[i]
    if (sample.height > interpolatedPoints[i].height) {
      intersectionPoint = sample
      break // 当height大于插值点的height时，说明近似找到了交点
    }
  }

  // 将交点添加到场景中
  if (intersectionPoint) {
    viewer.entities.add({
      position: Cesium.Cartesian3.fromRadians(intersectionPoint.longitude, intersectionPoint.latitude, intersectionPoint.height),
      point: {
        pixelSize: 10,
        color: Cesium.Color.YELLOW,
      }
    })
  }
}

// 计算两个点之间的距离(m)的函数
function calculateDistance(start, end) {
  const startCartographic = Cesium.Cartographic.fromDegrees(start.longitude, start.latitude)
  const endCartographic = Cesium.Cartographic.fromDegrees(end.longitude, end.latitude)
  return Cesium.Cartesian3.distance(
    Cesium.Cartesian3.fromRadians(startCartographic.longitude, startCartographic.latitude, start.height),
    Cesium.Cartesian3.fromRadians(endCartographic.longitude, endCartographic.latitude, end.height)
  )
}

// 生成起终点之间的插值点
function interpolatePoints(start, end, numPoints) {
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
