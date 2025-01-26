import * as Cesium from 'cesium'

class CustomPrimitive {
  constructor(position, viewer, cameraID, stanceOption) {
    this.shadowMap = createShadowMap(position, viewer, cameraID, stanceOption)
  }

  isDestroyed() {
    return false
  }

  update(e) {
    e.shadowMaps.push(this.shadowMap)
  }
}

function createShadowMap(position, viewer, cameraID, stanceOption) {
  // 创建一个相机
  let camera = new Cesium.Camera(viewer.scene)
  // 设置相机的视角（方向）
  camera.setView({
    destination: position,
    orientation: {
      heading: Cesium.Math.toRadians(stanceOption.heading-90),
      pitch: Cesium.Math.toRadians(stanceOption.pitch-90),
      roll: Cesium.Math.toRadians(stanceOption.roll),
    },
  })
  camera.frustum = new Cesium.PerspectiveFrustum({
    fov: Cesium.Math.toRadians(stanceOption.fov),
    aspectRatio: stanceOption.aspectRatio,
    near: 0.01,
    far: stanceOption.distance,
  })
  let cameraPrimitive = new Cesium.DebugCameraPrimitive({
    camera: camera,
    color: Cesium.Color.RED,
    show: stanceOption.frustumShow,
  })
  // 绑定唯一的id用于pick拾取信息
  cameraPrimitive.id = cameraID

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

export function createVideo3D(position, viewer, videoEle, cameraID, stanceOption) {
  let primitive = new CustomPrimitive(position, viewer, cameraID, stanceOption)
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