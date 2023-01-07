import { Center, Line, OrbitControls, OrthographicCamera } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { atom, useAtom } from "jotai"
import React, { Suspense, useState } from "react"
import { enumerateWinningLines, checkForWin } from "./winningLines"
import { useControls } from "leva"
import { Vector3 } from "three"

function randomHexcode() {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  )
}

const winningLines = enumerateWinningLines()
console.log(winningLines)

const Base = React.forwardRef(({ position, onClick }, ref) => {
  const [hovered, setHovered] = useState(false)

  return (
    <group ref={ref}>
      <mesh
        onClick={(e) => {
          onClick(e)
        }}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerEnter={(e) => {
          setHovered(true)
          e.stopPropagation()
        }}
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
        onPointerEnter={(e) => {
          setHovered(true)
          e.stopPropagation()
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
      res.push(new Vector3(x, 0, y))
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
      if (cells.find((v) => v.equals(cell))) {
        return cells
      } else {
        return [...cells, cell]
      }
    })

  return { cells, addCell: addCell }
}

const newCellPosition = (clickedCell, { face }) => {
  const normal = face.normal
  return clickedCell.clone().add(new Vector3(normal.x, normal.z, -normal.y))
}

function Room() {
  const { cells, addCell } = useCells()
  const bases = grid2(CELL_COUNT, CELL_COUNT)
  const { showLines } = useControls({ showLines: true })

  const hasWin = checkForWin(cells, winningLines)

  console.log("HAS WIN?", hasWin)
  console.log("cells", cells)

  return (
    <>
      <pointLight position={[30, 3, -10]} color="blue" intensity={10} />
      <group position={[0, 0, 0]}>
        {bases.map((pos) => (
          <Base
            key={`base-${pos.toArray()}`}
            position={pos.clone().multiplyScalar(CELL_SPACING)}
            onClick={(event) => {
              const [x, y, z] = pos
              addCell(new Vector3(x, y, z))
              event.stopPropagation()
            }}
          />
        ))}
        {cells.map((v) => (
          <Cell
            key={`cell-${[v.x, v.y, v.z]}`}
            position={v.clone().multiplyScalar(CELL_SPACING).add(new Vector3(0, BASE_OFFSET, 0))}
            onClick={(event) => {
              addCell(newCellPosition(v, event))
              event.stopPropagation()
            }}
          />
        ))}
        {showLines && (
          <group position={[0, BASE_OFFSET, 0]}>
            {winningLines.map((l) => {
              const col = randomHexcode()
              return (
                <Line
                  lineWidth={1}
                  points={l.map((p) => p.clone().multiplyScalar(CELL_SPACING))}
                  color={col}
                  key={col}
                />
              )
            })}
          </group>
        )}
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
          enableRotate={true}
          enablePan={false}
          enableDamping={true}
          dampingFactor={0.6}
        />
      </Canvas>
    </>
  )
}
