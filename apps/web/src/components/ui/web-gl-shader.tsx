"use client"

import { useEffect, useRef, useState } from "react"

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !canvasRef.current) return

    let animationId: number | null = null
    const canvas = canvasRef.current

    // Dynamic import Three.js only on client
    import("three").then((THREE) => {
      const vertexShader = `attribute vec3 position; void main() { gl_Position = vec4(position, 1.0); }`
      const fragmentShader = `
        precision highp float;
        uniform vec2 resolution; uniform float time; uniform float xScale; uniform float yScale; uniform float distortion;
        void main() {
          vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
          float d = length(p) * distortion;
          float rx = p.x * (1.0 + d); float gx = p.x; float bx = p.x * (1.0 - d);
          float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
          float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
          float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
          gl_FragColor = vec4(r, g, b, 1.0);
        }`

      const scene = new THREE.Scene()
      const renderer = new THREE.WebGLRenderer({ canvas })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(new THREE.Color(0x000000))
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)
      const uniforms = {
        resolution: { value: [window.innerWidth, window.innerHeight] },
        time: { value: 0.0 },
        xScale: { value: 1.0 },
        yScale: { value: 0.5 },
        distortion: { value: 0.05 },
      }
      const position = [-1,-1,0, 1,-1,0, -1,1,0, 1,-1,0, -1,1,0, 1,1,0]
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(position), 3))
      const material = new THREE.RawShaderMaterial({ vertexShader, fragmentShader, uniforms, side: THREE.DoubleSide })
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      const handleResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight, false)
        uniforms.resolution.value = [window.innerWidth, window.innerHeight]
      }
      handleResize()

      const animate = () => {
        uniforms.time.value += 0.01
        renderer.render(scene, camera)
        animationId = requestAnimationFrame(animate)
      }
      animate()
      window.addEventListener("resize", handleResize)

      // Store cleanup
      canvas.dataset.cleanup = "true"
      ;(canvas as any)._cleanup = () => {
        if (animationId) cancelAnimationFrame(animationId)
        window.removeEventListener("resize", handleResize)
        scene.remove(mesh)
        geometry.dispose()
        material.dispose()
        renderer.dispose()
      }
    })

    return () => {
      if ((canvas as any)._cleanup) (canvas as any)._cleanup()
    }
  }, [mounted])

  // Don't render canvas during SSR — prevents hydration mismatch
  if (!mounted) return null

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full block" />
}
