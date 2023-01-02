import * as THREE from "three"
import { shaderMaterial } from "@react-three/drei"
import { extend } from "@react-three/fiber"

const ShinyMaterial = shaderMaterial(
  { baseSpeed: 0.05, noiseTexture: null, noiseScale: 0.5337, alpha: 1.0, time: 10.0 },
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
  `,
  `
  uniform sampler2D baseTexture;
  uniform float baseSpeed;
  uniform sampler2D noiseTexture;
  uniform float noiseScale;
  uniform float alpha;
  uniform float time;
  uniform vec2 resolution;

  varying vec2 vUv;
  void main()
  {
    vec2 uvTimeShift = vUv + vec2( -0.3, 1.5 ) * time * baseSpeed;
    vec4 noiseGeneratorTimeShift = texture2D( noiseTexture, uvTimeShift );
    vec2 uvNoiseTimeShift = vUv + noiseScale * vec2( noiseGeneratorTimeShift.r, noiseGeneratorTimeShift.b );
    vec4 baseColor = texture2D( baseTexture, uvNoiseTimeShift );

    baseColor.a = alpha;
    gl_FragColor = baseColor;
  }
  `,
  (self) => {
    self.side = THREE.DoubleSide
  },
)

extend({ ShinyMaterial })
