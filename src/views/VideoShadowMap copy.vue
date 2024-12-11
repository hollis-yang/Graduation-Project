<template>
  <div id="cesiumContainer"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as Cesium from 'cesium'

onMounted(() => {
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0MGMyMWM0YS1lNDEyLTRjNWYtYTY3OS1jOTZkOWM1OThjYTEiLCJpZCI6MTkxMTMxLCJpYXQiOjE3MDU5MDY1ODN9.Tq3eObtuZJiqt4rDl-srQkMfz-WP9_EvKEPa_UvOI5s'

  // Initialize the Cesium Viewer
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
    terrainProvider: Cesium.createWorldTerrain()
  });
  viewer._cesiumWidget._creditContainer.style.display = 'none'
  viewer.clock.shouldAnimate = true
  viewer.scene.globe.depthTestAgainstTerrain = true

  let p = [117.205457, 31.842984, 53.9];
  p = Cesium.Cartesian3.fromDegrees(p[0], p[1], p[2]);
  let camera = new Cesium.Camera(viewer.scene);

  viewer.camera.flyTo({
    destination: p,
    orientation: {
      heading: Cesium.Math.toRadians(88.5-90),
      pitch: Cesium.Math.toRadians(-49.5-90),
      roll: 0
    },
    duration: 3
  });

  camera.setView({
    destination: p,
    orientation: {
      heading: Cesium.Math.toRadians(88.5-90),
      pitch: Cesium.Math.toRadians(-49.5-90),
      roll: 0
    }
  });

  camera.frustum = new Cesium.PerspectiveFrustum({
    fov: Cesium.Math.toRadians(46.3),
    aspectRatio: 2/1,
    near: 0.01,
    far: 1000
  });

  let cameraPrimitive = new Cesium.DebugCameraPrimitive({
    camera: camera,
    color: Cesium.Color.RED,
    show: true,
  });
  viewer.scene.primitives.add(cameraPrimitive);

  class CustomPrimitive {
    constructor() {}
    isDestroyed() {
      return false;
    }
    update(frameState) {
      frameState.shadowMaps.push(shadowMap);
    }
  }

  let shadowMap = new Cesium.ShadowMap({
    lightCamera: camera,
    context: viewer.scene.context,
    isSpotLight: true,
    isPointLight: false,
    cascadesEnabled: false,
  })

  let primitive = new CustomPrimitive();
  viewer.scene.primitives.add(primitive);

  // 创建视频元素
  let videoEle = document.createElement("video");
  videoEle.setAttribute("muted", true);
  videoEle.setAttribute("loop", true);
  videoEle.setAttribute("autoplay", true);
  document.body.appendChild(videoEle);
  videoEle.setAttribute("src", "/lukou.mp4");
  videoEle.style.cssText = "position:absolute;left:0px;top:0px;width:320px;height:240px;display:none";

  // 等待视频加载完数据
  videoEle.addEventListener('loadeddata', () => {
    let fragmentShader = `
    uniform sampler2D colorTexture;
    varying vec2 v_textureCoordinates;
    uniform sampler2D depthTexture;
    uniform sampler2D videoTexture; 
    uniform mat4 shadowMap_matrix;

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

      // 阴影位置变换，作为应用视频纹理的区域
      vec4 shadowPosition = shadowMap_matrix * positionEC; 
      shadowPosition /= shadowPosition.w; 

      // 检查是否在阴影区域内（原先的区域）
      if (all(greaterThanEqual(shadowPosition.xyz, vec3(0.0))) && all(lessThanEqual(shadowPosition.xyz, vec3(1.0)))) {
        vec2 videoCoords = vec2(1.0 - shadowPosition.x, 1.0 - shadowPosition.y);
        vec4 videoColor = texture2D(videoTexture, videoCoords);
        gl_FragColor = vec4(videoColor.xyz, 1.);
      } 
    }
    `;

    // 创建视频纹理
    let videoTexture = new Cesium.Texture({
      context: viewer.scene.context,
      source: videoEle,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE
    });

    // 定时更新视频纹理
    function updateVideoTexture() {
      if (videoEle.readyState >= videoEle.HAVE_CURRENT_DATA) {
        videoTexture.copyFrom({
          source: videoEle
        });
      }
      requestAnimationFrame(updateVideoTexture);
    }
    updateVideoTexture();

    let uniforms = {
      videoTexture: videoTexture,
      shadowMap_matrix: () => shadowMap._shadowMapMatrix,
    };

    let postProcessStage = new Cesium.PostProcessStage({
      fragmentShader: fragmentShader,
      uniforms: uniforms
    });

    viewer.scene.postProcessStages.add(postProcessStage);
  });
});
</script>






<style scoped lang="scss">
#cesiumContainer {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
</style>
