import type { WebGLRenderer } from 'three'
import type { GLTFLoader } from 'three-stdlib'
import { KTX2Loader } from 'three-stdlib'

const TRANSCODER_PATH = '/basis/'
const loaderByRenderer = new WeakMap<WebGLRenderer, KTX2Loader>()

export function configureKTX2ForGLTFLoader(loader: GLTFLoader, renderer: WebGLRenderer): void {
  let ktx2Loader = loaderByRenderer.get(renderer)

  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader()
    ktx2Loader.setTranscoderPath(TRANSCODER_PATH)
    ktx2Loader.detectSupport(renderer)
    loaderByRenderer.set(renderer, ktx2Loader)
  }

  loader.setKTX2Loader(ktx2Loader)
}
