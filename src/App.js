import { Center, OrbitControls, OrthographicCamera } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import React, { Suspense, useState } from "react"
import { atom, useAtom, useAtomValue } from "jotai"

const Base = React.forwardRef(({ position, onClick }, ref) => {
  const [hovered, setHovered] = useState(false)

  return (
    <group ref={ref}>
      <mesh
        onClick={() => {
          console.log("Clicked", position.map(Math.floor))
          onClick()
        }}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        position={position}>
        <boxGeometry args={[1.5, 1.5, 0.05]} />
        <meshStandardMaterial color={hovered ? "blue" : "#99aaff"} />
      </mesh>
    </group>
  )
})

const Cell = React.forwardRef(({ position, onClick }, ref) => {
  const [hovered, setHovered] = useState(false)

  return (
    <group ref={ref}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={({ face, faceIndex }) => {
          setHovered(true)
          console.log(face.normal, faceIndex)
        }}
        onClick={(event) => onClick(event)}
        onPointerLeave={() => setHovered(false)}
        position={position}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color={hovered ? "blue" : "#5599ff"} />
      </mesh>
    </group>
  )
})

function grid2(w, h) {
  const res = []
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      res.push([x, 0, y])
    }
  }

  return res
}

function grid3(w, h, d) {
  const res = []

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      for (let z = 0; z < d; z++) {
        res.push([x, y, z])
      }
    }
  }

  return res
}

const CELL_COUNT = 4
const CELL_SPACING = 1.66
const BASE_OFFSET = 0.5

const cellsAtom = atom([])

const useCells = () => {
  const [cells, setCells] = useAtom(cellsAtom)

  const addCell = (cell) =>
    setCells((cells) => {
      if (cells.find(([x, y, z]) => x === cell[0] && y === cell[1] && z === cell[2])) {
        return cells
      } else {
        return [...cells, cell]
      }
    })

  return { cells, addCell: addCell }
}

const newCellPosition = (clickedCell, { face }) => {
  const normal = face.normal.multiplyScalar(CELL_SPACING)
  return [clickedCell[0] + normal.x, clickedCell[1] + normal.z, clickedCell[2] - normal.y]
}

function Room() {
  const { cells, addCell } = useCells()
  const base = grid2(CELL_COUNT, CELL_COUNT).map(([x, y, z]) => [x * CELL_SPACING, y * CELL_SPACING, z * CELL_SPACING])

  return (
    <>
      <pointLight position={[30, 3, -10]} color="blue" intensity={10} />
      <group position={[0, 0, 0]}>
        {base.map((pos) => (
          <Base
            key={`base-${pos}`}
            position={pos}
            onClick={() => {
              const [x, z, y] = pos
              addCell([x, z + BASE_OFFSET, y])
            }}
          />
        ))}
        {cells.map(([x, z, y]) => (
          <Cell
            key={`cell-${[x, z, y]}`}
            position={[x, z + BASE_OFFSET, y]}
            onClick={(event) => addCell(newCellPosition([x, z, y], event))}
          />
        ))}
      </group>
    </>
  )
}

const useIsometricRotation = () => {
  const ref = React.useRef(null)

  const rotate = (rotation) => {
    if (ref.current) {
      const { setAzimuthalAngle, getAzimuthalAngle } = ref.current
      setAzimuthalAngle(getAzimuthalAngle() + rotation)
    }
  }

  return {
    ref,
    onLeft: () => rotate(-Math.PI / 2),
    onRight: () => rotate(Math.PI / 2),
  }
}

export default function App() {
  const { ref, onLeft, onRight } = useIsometricRotation()

  return (
    <>
      <div>
        <button onClick={onLeft}>Left</button>
        <button onClick={onRight}>Right</button>
      </div>

      <Canvas>
        <color attach="background" args={["black"]} />
        <OrthographicCamera makeDefault position={[15, 15, 15]} zoom={80} />
        <ambientLight intensity={0.1} />
        <pointLight position={[10, 10, 10]} />
        <Suspense fallback={null}>
          <Center>
            <Room />
          </Center>
        </Suspense>
        <OrbitControls
          ref={ref}
          minPolarAngle={Math.PI / 3.5}
          maxPolarAngle={Math.PI / 3.5}
          enableRotate={false}
          enablePan={false}
          enableDamping={true}
          dampingFactor={0.6}
        />
      </Canvas>
    </>
  )
}
