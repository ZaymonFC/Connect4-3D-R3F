import { useFrame, useThree } from "@react-three/fiber"
import { useCallback, useEffect, useRef } from "react"
import { Vector3 } from "three"
import { DIMENSIONS } from "./const"

export function useMousePositionZ(targetZ) {
  const { camera } = useThree()

  const mousePos = useRef(new Vector3(0, 0, 0))
  const vec = useRef(new Vector3(0, 0, 0))
  const projectedPos = useRef(new Vector3(0, 0, 0))

  useFrame(() => {
    vec.current.copy(mousePos.current)
    vec.current.unproject(camera)
    vec.current.sub(camera.position).normalize()

    var distance = (targetZ - camera.position.z) / vec.current.z

    // Note: we want to avoid new-ing here if we can
    projectedPos.current = new Vector3().copy(camera.position).add(vec.current.multiplyScalar(distance))
  })

  const onMouseMoved = useCallback(
    (event) => {
      mousePos.current.set((event.clientX / DIMENSIONS.width) * 2 - 1, -(event.clientY / DIMENSIONS.height) * 2 + 1, 0.5)
    },
    [mousePos],
  )

  useEffect(() => {
    document.addEventListener("mousemove", onMouseMoved)

    return () => {
      document.removeEventListener("mousemove", onMouseMoved)
    }
  }, [onMouseMoved])

  return { mouse: mousePos, projected: projectedPos }
}

export function useMousePositionY(targetY) {
  const { camera } = useThree()

  const mousePos = useRef(new Vector3(0, 0, 0))
  const vec = useRef(new Vector3(0, 0, 0))
  const projectedPos = useRef(new Vector3(0, 0, 0))

  useFrame(() => {
    vec.current.copy(mousePos.current)
    vec.current.unproject(camera)
    vec.current.sub(camera.position).normalize()

    var distance = (targetY - camera.position.y) / vec.current.y

    // Note: we want to avoid new-ing here if we can
    projectedPos.current = new Vector3().copy(camera.position).add(vec.current.multiplyScalar(distance))
  })

  const onMouseMoved = useCallback(
    (event) => {
      mousePos.current.set((event.clientX / DIMENSIONS.width) * 2 - 1, -(event.clientY / DIMENSIONS.height) * 2 + 1, 0.5)
    },
    [mousePos],
  )

  useEffect(() => {
    document.addEventListener("mousemove", onMouseMoved)

    return () => {
      document.removeEventListener("mousemove", onMouseMoved)
    }
  }, [onMouseMoved])

  return { mouse: mousePos, projected: projectedPos }
}
