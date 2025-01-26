import * as Cesium from 'cesium'

/**
 * 控制多路视频视锥体+点位entity显隐
 */
export function toggleDebugCameraPrimitives(viewer, show) {
  viewer.scene.primitives._primitives.forEach(primitive => {
    if (primitive instanceof Cesium.DebugCameraPrimitive) {
      primitive.show = show
    }
  })

  viewer.entities.values.forEach(entity => {
    if (entity.id && entity.id.startsWith('camera-position')) {
      entity.show = show
    }
  })
}
