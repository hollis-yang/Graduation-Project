<template>
  <div id="cesiumContainer"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as Cesium from 'cesium'
import Hls from 'hls.js'

onMounted(() => {
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0MGMyMWM0YS1lNDEyLTRjNWYtYTY3OS1jOTZkOWM1OThjYTEiLCJpZCI6MTkxMTMxLCJpYXQiOjE3MDU5MDY1ODN9.Tq3eObtuZJiqt4rDl-srQkMfz-WP9_EvKEPa_UvOI5s'

  // Cesium Viewer
  const viewer = new Cesium.Viewer('cesiumContainer', {
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

  /**
   * 影像图层与地形图层
   */
  // 吉林一号
  const jilin2023Layer = new Cesium.UrlTemplateImageryProvider({
    url: 'https://api.jl1mall.com/getMap/{z}/{x}/{reverseY}?mk=73ad26c4aa6957eef051ecc5a15308b4&tk=8c7cc72e35c8f91255a07175a328b3b2'
  })
  // 天地图
  const tdtAnnoLayer = new Cesium.WebMapTileServiceImageryProvider({
    url: 'http://t0.tianditu.com/cia_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cia&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default.jpg&tk=7b13a4031f051b6317cdcca67ae391f1',
    layer: 'tdtAnnoLayer',
    style: 'default',
    format: 'image/jpeg',
    tileMatrixSetID: 'GoogleMapsCompatible',
    show: false,
  })
  // viewer.imageryLayers.addImageryProvider(jilin2023Layer)
  viewer.imageryLayers.addImageryProvider(tdtAnnoLayer)






  class CustomPrimitive {
    constructor(position) {
      this.shadowMap = createShadowMap(position)
    }

    isDestroyed() {
      return false
    }

    update(e) {
      e.shadowMaps.push(this.shadowMap)
    }
  }

  function createShadowMap(position) {
    // 创建一个相机
    let camera = new Cesium.Camera(viewer.scene)
    // 设置相机的视角（方向）
    camera.setView({
      destination: position,
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-50),
        roll: 0,
      },
    })
    camera.frustum = new Cesium.PerspectiveFrustum({
      fov: Cesium.Math.toRadians(50),
      aspectRatio: 1,
      near: 1,
      far: 200,
    })
    let cameraPrimitive = new Cesium.DebugCameraPrimitive({
      camera: camera,
      color: Cesium.Color.RED,
      show: true,
    })
    viewer.scene.primitives.add(cameraPrimitive)
    viewer.entities.add({
      position: position,
      point: {
        pixelSize: 10,
        color: Cesium.Color.RED,
      },
    })
    let shadowMap = new Cesium.ShadowMap({
      lightCamera: camera,
      context: viewer.scene.context,
      isSpotLight: !0,
      isPointLight: !1,
      cascadesEnabled: !1,
      darkness: 1,
    })
    return shadowMap
  }

  function createVideo3D(position, viewer) {
    let primitive = new CustomPrimitive(position)
    viewer.scene.primitives.add(primitive)
    const shadowMap = primitive.shadowMap

    let fragmentShader = `
      uniform sampler2D colorTexture;
      varying vec2 v_textureCoordinates;
      uniform sampler2D depthTexture;

      uniform sampler2D shadowMap_texture;
      uniform sampler2D videoTexture;
      uniform mat4 shadowMap_matrix;
      uniform vec4 shadowMap_lightPositionEC;
      uniform vec4 shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness;
      uniform vec4 shadowMap_texelSizeDepthBiasAndNormalShadingSmooth;

      float czm_shadowVisibility(sampler2D shadowMap, vec4 shadowPosition, float depthBias, float darkness) {
          vec2 uv = shadowPosition.xy;
          float depth = shadowPosition.z - depthBias;
          float shadowDepth = texture2D(shadowMap, uv).r;
          return (shadowDepth < depth) ? darkness : 1.0;
      }

      void main() {
          vec4 color = texture2D(colorTexture, v_textureCoordinates);
          gl_FragColor = color;

          float depth = czm_unpackDepth(texture2D(depthTexture, v_textureCoordinates));
          if (depth >= 1.0) {
              return;
          }

          vec4 positionEC = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
          vec3 normalEC = vec3(1.0, 0.0, 0.0);

          vec3 directionEC = normalize(positionEC.xyz - shadowMap_lightPositionEC.xyz);
          float nDotL = clamp(dot(normalEC, -directionEC), 0.0, 1.0);

          vec4 shadowPosition = shadowMap_matrix * positionEC;
          shadowPosition /= shadowPosition.w;

          if (any(lessThan(shadowPosition.xyz, vec3(0.0))) || any(greaterThan(shadowPosition.xyz, vec3(1.0)))) {
              return;
          }

          float visibility = czm_shadowVisibility(
              shadowMap_texture,
              shadowPosition,
              shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.z,
              shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness.w
          );

          if (visibility == 1.0) {
              vec4 videoColor = texture2D(videoTexture, shadowPosition.xy);
              gl_FragColor = vec4(videoColor.rgb, 1.0);
          }
      }
    `

    let videoTexture = new Cesium.Texture({
      context: viewer.scene.context,
      source: videoEle,
    })
    let bias = shadowMap._primitiveBias
    let scratchTexelStepSize = new Cesium.Cartesian2()
    let uniforms = {
      shadowMap_texture: function () {
        return shadowMap._shadowMapTexture
      },
      shadowMap_textureCube: function () {
        return shadowMap._shadowMapTexture
      },
      shadowMap_matrix: function () {
        return shadowMap._shadowMapMatrix
      },
      shadowMap_cascadeSplits: function () {
        return shadowMap._cascadeSplits
      },
      shadowMap_cascadeMatrices: function () {
        return shadowMap._cascadeMatrices
      },
      shadowMap_lightDirectionEC: function () {
        return shadowMap._lightDirectionEC
      },
      shadowMap_lightPositionEC: function () {
        return shadowMap._lightPositionEC
      },
      shadowMap_cascadeDistances: function () {
        return shadowMap._cascadeDistances
      },
      shadowMap_texelSizeDepthBiasAndNormalShadingSmooth: function () {
        var texelStepSize = scratchTexelStepSize
        texelStepSize.x = 1.0 / shadowMap._textureSize.x
        texelStepSize.y = 1.0 / shadowMap._textureSize.y

        return Cesium.Cartesian4.fromElements(
          texelStepSize.x,
          texelStepSize.y,
          bias.depthBias,
          bias.normalShadingSmooth,
          this.combinedUniforms1
        )
      },
      shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness: function () {
        return Cesium.Cartesian4.fromElements(
          bias.normalOffsetScale,
          shadowMap._distance,
          shadowMap.maximumDistance,
          shadowMap._darkness,
          this.combinedUniforms2
        )
      },

      videoTexture: function () {
        return Cesium.Texture.create({
          context: viewer.scene.context,
          source: videoEle,
          pixelFormat: Cesium.PixelFormat.RGBA,
          pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE,
        })
      },
      combinedUniforms1: new Cesium.Cartesian4(),
      combinedUniforms2: new Cesium.Cartesian4(),
    }
    let postProcessStage = new Cesium.PostProcessStage({
      fragmentShader: fragmentShader,
      uniforms: uniforms,
    })

    viewer.scene.postProcessStages.add(postProcessStage)
  }


  // 创建视频元素
  let videoEle = document.createElement("video")
  videoEle.setAttribute("muted", true)
  videoEle.setAttribute("loop", true)
  videoEle.setAttribute("autoplay", true)
  document.body.appendChild(videoEle)
  videoEle.setAttribute("src", "/lukou.mp4")
  videoEle.style.cssText = "position:absolute;left:0px;top:0px;width:320px;height:240px;display:none";

  videoEle.addEventListener('loadeddata', () => {
    let p = [121.11124, 31.14121, 100.49794]
    let p1 = Cesium.Cartesian3.fromDegrees(p[0]- 0.001, p[1], p[2])
    createVideo3D(p1, viewer)
    let p2 = Cesium.Cartesian3.fromDegrees(p[0] + 0.001, p[1], p[2])
    createVideo3D(p2, viewer)

    // 定位到p
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(p[0], p[1], p[2]),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
      duration: 1,
    })
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
