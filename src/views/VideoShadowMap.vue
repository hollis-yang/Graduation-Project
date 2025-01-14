<template>
  <div id="cesiumContainer"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as Cesium from 'cesium'
import Hls from 'hls.js'
import * as dat from 'dat.gui'

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

  let p = [118.166,30.143,1800]  // 探头坐标xyz
  p = Cesium.Cartesian3.fromDegrees(p[0], p[1], p[2])
  let position = {
    heading: 88.5,
    pitch: -49.5,
    roll: 0,
    fov: 46.3,
    aspectRatio: 2/1,
    distance: 1000
  }  // 探头姿态

  let camera = new Cesium.Camera(viewer.scene)
  camera.flyTo({
    destination: p,
    orientation: {
      heading: Cesium.Math.toRadians(position.heading-90),
      pitch: Cesium.Math.toRadians(position.pitch-90),
      roll: Cesium.Math.toRadians(position.roll)
    },
    duration: 3
  })

  camera.setView({
    destination: p,
    orientation: {
      heading: Cesium.Math.toRadians(position.heading-90),
      pitch: Cesium.Math.toRadians(position.pitch-90),
      roll: Cesium.Math.toRadians(position.roll)
    }
  })

  camera.frustum = new Cesium.PerspectiveFrustum({
    fov: Cesium.Math.toRadians(position.fov),
    aspectRatio: position.aspectRatio,
    near: 0.01,
    far: position.distance
  })

  let cameraPrimitive = new Cesium.DebugCameraPrimitive({
    camera: camera,
    color: Cesium.Color.RED,
    show: true,
  })
  viewer.scene.primitives.add(cameraPrimitive)

  class CustomPrimitive {
    constructor() {}
    isDestroyed() {
      return false
    }
    update(frameState) {
      frameState.shadowMaps.push(shadowMap)
    }
  }

  let shadowMap = new Cesium.ShadowMap({
    lightCamera: camera,
    context: viewer.scene.context,
    isSpotLight: true,
    isPointLight: false,
    cascadesEnabled: false,
  })

  let primitive = new CustomPrimitive()
  viewer.scene.primitives.add(primitive)

  // 相机调整gui
  const gui = new dat.GUI()
  gui.add(position, 'heading', 0, 360, 0.1).onChange(e => updateGUI())
  gui.add(position, 'pitch', -180, 180, 0.1).onChange(e => updateGUI())
  gui.add(position, 'roll', -180, 180, 0.1).onChange(e => updateGUI())
  gui.add(position, 'fov', 1, 90, 0.1).onChange(e => updateGUI())
  gui.add(position, 'aspectRatio', 0.1, 5, 0.1).onChange(e => updateGUI())
  gui.add(position, 'distance', 1, 2000, 1).onChange(e => updateGUI())
  
  function updateGUI() {
    camera.setView({
      destination: p,
      orientation: {
        heading: Cesium.Math.toRadians(position.heading-90),
        pitch: Cesium.Math.toRadians(position.pitch-90),
        roll: Cesium.Math.toRadians(position.roll)
      }
    })

    camera.frustum = new Cesium.PerspectiveFrustum({
      fov: Cesium.Math.toRadians(position.fov),
      aspectRatio: position.aspectRatio,
      near: 0.01,
      far: position.distance
    })
  }

  // 创建视频元素
  let videoEle = document.createElement("video")
  videoEle.setAttribute("muted", true)
  videoEle.setAttribute("loop", true)
  videoEle.setAttribute("autoplay", true)
  document.body.appendChild(videoEle)
  // videoEle.setAttribute("src", "/lukou.mp4")
  videoEle.style.cssText = "position:absolute;left:0px;top:0px;width:320px;height:240px;display:none";

  if (Hls.isSupported()) {
    const hls = new Hls()
    hls.loadSource('http://hls01open.ys7.com/openlive/50c94278dd444de194c8f9251b4db27e.m3u8')
    hls.attachMedia(videoEle)
    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      videoEle.play().then(() => {
        console.log('Video playing')
      }).catch(error => {
        console.error('Video play error:', error)
      })
    })
  } else if (videoEle.canPlayType('application/vnd.apple.mpegurl')) {
    videoEle.src = 'http://hls01open.ys7.com/openlive/50c94278dd444de194c8f9251b4db27e.m3u8'
    videoEle.addEventListener('loadedmetadata', function () {
      videoEle.play().then(() => {
        console.log('Video playing')
      }).catch(error => {
        console.error('Video play error:', error)
      })
    })
  } else {
    console.error('HLS.js is not supported in this browser.')
  }

  // 等待视频加载完数据
  videoEle.addEventListener('loadeddata', () => {
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

    float _czm_shadowVisibility(sampler2D shadowMap, czm_shadowParameters shadowParameters) {
      float depthBias = shadowParameters.depthBias;
      float depth = shadowParameters.depth;
      float nDotL = shadowParameters.nDotL;
      float normalShadingSmooth = shadowParameters.normalShadingSmooth;
      float darkness = shadowParameters.darkness;
      vec2 uv = shadowParameters.texCoords;
      depth -= depthBias; 
      float visibility = czm_shadowDepthCompare(shadowMap, uv, depth); 
      return visibility;
    }

    void main() { 
      vec4 color = texture2D(colorTexture, v_textureCoordinates);
      gl_FragColor = texture2D(colorTexture, v_textureCoordinates);  
      float depth = czm_unpackDepth(texture2D(depthTexture, v_textureCoordinates)); 
      if (depth >= 1.0) { 
        return; 
      }  

      // 当前像素的坐标（相机坐标系）
      vec4 eyeCoordinate4 = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);  
      vec4 positionEC = eyeCoordinate4 / eyeCoordinate4.w;

      // 开始 
      vec3 normalEC = vec3(1.);
      czm_shadowParameters shadowParameters; 
      shadowParameters.texelStepSize = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.xy; 
      shadowParameters.depthBias = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.z; 
      shadowParameters.normalShadingSmooth = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.w; 
      shadowParameters.darkness = shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness.w;
      shadowParameters.depthBias *= max(depth * .01, 1.);
      vec3 directionEC = normalize(positionEC.xyz - shadowMap_lightPositionEC.xyz); 
      float nDotL = clamp(dot(normalEC, -directionEC), 0.0, 1.0); 

      vec4 shadowPosition = shadowMap_matrix * positionEC; 
      shadowPosition /= shadowPosition.w; 

      if (any(lessThan(shadowPosition.xyz, vec3(0.0))) || any(greaterThan(shadowPosition.xyz, vec3(1.0)))) { 
        return; 
      } 

      shadowParameters.texCoords = shadowPosition.xy; 
      shadowParameters.depth = shadowPosition.z; 
      shadowParameters.nDotL = nDotL; 
      float visibility = _czm_shadowVisibility(shadowMap_texture, shadowParameters);  

      if (visibility == 1.0) {
        vec2 rotatedCoords = vec2(1.0 - shadowPosition.x, 1.0 - shadowPosition.y);
        vec4 videoColor = texture2D(videoTexture, rotatedCoords);
        gl_FragColor = vec4(videoColor.xyz, 1.);
      } 
    }`

    // 创建视频纹理
    let videoTexture = new Cesium.Texture({
      context: viewer.scene.context,
      source: videoEle,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE
    })

    // 定时更新视频纹理
    function updateVideoTexture() {
      if (videoEle.readyState >= videoEle.HAVE_CURRENT_DATA) {
        videoTexture.copyFrom({
          source: videoEle
        })
      }
      requestAnimationFrame(updateVideoTexture)
    }
    updateVideoTexture()

    let uniforms = {
      videoTexture: videoTexture,
      shadowMap_texture: () => shadowMap._shadowMapTexture,
      shadowMap_matrix: () => shadowMap._shadowMapMatrix,
      shadowMap_lightPositionEC: () => shadowMap._lightPositionEC,
      shadowMap_texelSizeDepthBiasAndNormalShadingSmooth: () => {
        const texelStepSize = new Cesium.Cartesian2(
          1.0 / shadowMap._textureSize.x,
          1.0 / shadowMap._textureSize.y
        )
        return new Cesium.Cartesian4(
          texelStepSize.x,
          texelStepSize.y,
          shadowMap._primitiveBias.depthBias,
          shadowMap._primitiveBias.normalShadingSmooth
        )
      },
      shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness: () => {
        return new Cesium.Cartesian4(
          shadowMap._primitiveBias.normalOffsetScale,
          shadowMap._distance,
          shadowMap.maximumDistance,
          shadowMap._darkness
        )
      }
    }

    let postProcessStage = new Cesium.PostProcessStage({
      fragmentShader: fragmentShader,
      uniforms: uniforms
    })

    viewer.scene.postProcessStages.add(postProcessStage);
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
