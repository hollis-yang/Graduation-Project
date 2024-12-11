<template>
  <div id="cesiumContainer"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
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
  })
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
  })

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

  let bias = shadowMap._primitiveBias;
  let scratchTexelStepSize = new Cesium.Cartesian2();
  let uniforms = {
    shadowMap_texture: () => shadowMap._shadowMapTexture,
    shadowMap_matrix: () => shadowMap._shadowMapMatrix,
    shadowMap_lightPositionEC: () => shadowMap._lightPositionEC,
    shadowMap_texelSizeDepthBiasAndNormalShadingSmooth: () => {
      const texelStepSize = scratchTexelStepSize;
      texelStepSize.x = 1.0 / shadowMap._textureSize.x;
      texelStepSize.y = 1.0 / shadowMap._textureSize.y;
      return new Cesium.Cartesian4(
        texelStepSize.x,
        texelStepSize.y,
        bias.depthBias,
        bias.normalShadingSmooth
      );
    },
    shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness: () => {
      return new Cesium.Cartesian4(
        bias.normalOffsetScale,
        shadowMap._distance,
        shadowMap.maximumDistance,
        shadowMap._darkness
      );
    }
  };

  let fragmentShader = `
    uniform sampler2D colorTexture;
    varying vec2 v_textureCoordinates;
    uniform sampler2D depthTexture;

    uniform sampler2D shadowMap_texture; 
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
      gl_FragColor = color;  
      float depth = czm_unpackDepth(texture2D(depthTexture, v_textureCoordinates)); 

      if (depth >= 1.0) { 
        return; 
      }  

      vec4 eyeCoordinate4 = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);  
      vec4 positionEC = eyeCoordinate4 / eyeCoordinate4.w;

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
        gl_FragColor += vec4(0.0, 1.0, 0.0, 0.5); // Visible as green
      } else { 
        gl_FragColor += vec4(1.0, 0.0, 0.0, 0.2); // Not visible as red
      }
    }
  `;

  const postProcessStage = new Cesium.PostProcessStage({
      fragmentShader: fragmentShader,
      uniforms: uniforms
  });
  viewer.scene.postProcessStages.add(postProcessStage);

})
</script>


<style scoped lang="scss">
#cesiumContainer {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
</style>
