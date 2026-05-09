'use client'

import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
  SMAA,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

export default function BurgerEffects() {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        intensity={0.38}
        luminanceThreshold={0.88}
        luminanceSmoothing={0.22}
        mipmapBlur
      />
      <DepthOfField
        focusDistance={0.018}
        focalLength={0.05}
        bokehScale={2.4}
      />
      <Vignette
        offset={0.30}
        darkness={0.55}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
