// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rendersInSoftware } from './stage'

const RENDERER = 0x1f01
const UNMASKED_RENDERER = 0x9246

/** A WebGL context that names its renderer, with or without the debug extension. */
function webgl(renderer: string, debugInfo = true) {
  const loseContext = vi.fn()
  const context = {
    RENDERER,
    getExtension: (name: string) => {
      if (name === 'WEBGL_lose_context') return { loseContext }
      if (name === 'WEBGL_debug_renderer_info' && debugInfo) {
        return { UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER }
      }
      return null
    },
    getParameter: (parameter: number) =>
      parameter === UNMASKED_RENDERER ? renderer : debugInfo ? 'WebKit WebGL' : renderer,
  }
  // A stand-in for the browser's context, whichever overload of getContext it comes from.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never)
  return { loseContext }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('rendersInSoftware', () => {
  it('tells renderers without a graphics card from those with one', () => {
    webgl('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)')
    expect(rendersInSoftware()).toBe(true)
    webgl('llvmpipe (LLVM 15.0.7, 256 bits)')
    expect(rendersInSoftware()).toBe(true)
    webgl('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)')
    expect(rendersInSoftware()).toBe(false)
  })

  it('reads the plain renderer name where the browser hides the real one', () => {
    webgl('Microsoft Basic Render Driver', false)
    expect(rendersInSoftware()).toBe(true)
  })

  it('lets go of the context it asked', () => {
    const { loseContext } = webgl('Apple M2')
    rendersInSoftware()
    expect(loseContext).toHaveBeenCalledOnce()
  })

  it('assumes a graphics card where there is no WebGL to ask', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(rendersInSoftware()).toBe(false)
  })
})
