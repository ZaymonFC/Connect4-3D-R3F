import { Center, Cylinder, Line, OrbitControls, PerspectiveCamera, RoundedBox, Torus } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import { styled } from "@stitches/react"
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai"
import { useControls } from "leva"
import React, { Suspense, useEffect, useState } from "react"
import { Vector3 } from "three"
import { checkForWin, enumerateWinningLines } from "./winningLines"

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

const usePulse = (ref, enable, min, max, initial) => {
  useFrame(({ clock }) => {
    if (enable) {
      const t = clock.getElapsedTime()
      const scale = Math.sin(t * 4) * (max - min) + min
      ref.current.material.opacity = scale
    } else {
      ref.current.material.opacity = initial
    }
  })
}

const Cell = React.forwardRef(({ position, onClick, player, highlight }, ref) => {
  const [hovered, setHovered] = useState(false)
  const meshRef = React.useRef()

  usePulse(meshRef, highlight, 0.8, 1, 0.98)

  return (
    <group ref={ref}>
      <Torus ref={meshRef} position={position} rotation-x={Math.PI / 2} args={[0.5, 0.2]}>
        <meshStandardMaterial transparent color={hovered ? "blue" : player === "red" ? "#ff0000" : "#ffff00"} />
      </Torus>
      <Cylinder scale={[0.15, 1, 0.15]} position={position}>
        <meshPhysicalMaterial
          specularIntensity={1}
          metalness={0.7}
          clearcoat={1}
          opacity={highlight ? 1 : 0.8}
          transparent
          color={hovered ? "blue" : player === "red" ? "#ffaaaa" : "#ffffaa"}
        />
      </Cylinder>
      <mesh
        visible={false}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerEnter={(e) => {
          setHovered(true)
          e.stopPropagation()
        }}
        onClick={(event) => onClick(event)}
        onPointerLeave={() => setHovered(false)}
        position={position}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={hovered ? "blue" : player === "red" ? "#ff0000" : "#ffff00"} />
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
const BASE_OFFSET = 0.25

const gameStateAtom = atom("playing")

const cellsAtom = atom([])
const redCellsAtom = atom((get) =>
  get(cellsAtom)
    .filter((v) => v.player === "red")
    .map((m) => m.cell),
)
const yellowCellsAtom = atom((get) =>
  get(cellsAtom)
    .filter((v) => v.player === "yellow")
    .map((m) => m.cell),
)

const useCells = () => {
  const [cells, setCells] = useAtom(cellsAtom)
  const gameState = useAtomValue(gameStateAtom)

  const addCell = (move, player) =>
    setCells((cells) => {
      // If game is over, don't add any more cells
      if (gameState !== "playing") return cells

      // bail if outside bounds
      if (move.x < 0 || move.x >= CELL_COUNT) return cells
      if (move.y < 0 || move.y >= CELL_COUNT) return cells
      if (move.z < 0 || move.z >= CELL_COUNT) return cells

      // must be above another cell
      if (move.y > 0 && !cells.some(({ cell }) => cell.equals(move.clone().add(new Vector3(0, -1, 0))))) return cells

      // check if already in list
      if (cells.find(({ cell }) => cell.equals(move))) {
        return cells
      } else {
        return [...cells, { cell: move, player }]
      }
    })

  return { cells, addCell }
}

const newCellPosition = (clickedCell, { face }) => {
  const normal = face.normal
  return clickedCell.clone().add(new Vector3(normal.x, normal.z, -normal.y))
}

const useCheckForWin = (redWinningLine, yellowWinningLine) => {
  const setGameState = useSetAtom(gameStateAtom)

  useEffect(() => {
    if (redWinningLine) {
      setGameState("red-won")
    } else if (yellowWinningLine) {
      setGameState("yellow-won")
    }
  }, [redWinningLine, yellowWinningLine, setGameState])
}

function inWinningLine(cell, winningLine) {
  if (!winningLine) return false
  return winningLine.some((lineCell) => lineCell.equals(cell))
}

function Room() {
  const { cells, addCell } = useCells()
  const redCells = useAtomValue(redCellsAtom)
  const yellowCells = useAtomValue(yellowCellsAtom)
  const bases = grid2(CELL_COUNT, CELL_COUNT)
  const { showLines } = useControls({ showLines: false })

  const takingTurn = cells.length % 2 === 0 ? "red" : "yellow"
  const redWinningLine = checkForWin(redCells, winningLines)
  const yellowWinningLine = checkForWin(yellowCells, winningLines)

  console.log("HAS WIN?", redWinningLine, yellowWinningLine)

  useCheckForWin(redWinningLine, yellowWinningLine)

  return (
    <>
      <pointLight position={[30, 3, -10]} color="blue" intensity={7} />
      <group position={[0, 0, 0]}>
        {bases.map((pos) => (
          <Base
            key={`base-${pos.toArray()}`}
            position={pos.clone().multiplyScalar(CELL_SPACING)}
            onClick={(event) => {
              const [x, y, z] = pos
              addCell(new Vector3(x, y, z), takingTurn)
              event.stopPropagation()
            }}
          />
        ))}
        <group position={[0, BASE_OFFSET, 0]}>
          {cells.map(({ cell: v, player }) => (
            <Cell
              player={player}
              key={`cell-${[v.x, v.y, v.z]}`}
              position={v
                .clone()
                .multiplyVectors(v.clone(), new Vector3(CELL_SPACING, 1, CELL_SPACING))
                .add(new Vector3(0, BASE_OFFSET, 0))}
              onClick={(event) => {
                addCell(newCellPosition(v, event), takingTurn)
                event.stopPropagation()
              }}
              highlight={inWinningLine(v, redWinningLine) || inWinningLine(v, yellowWinningLine)}
            />
          ))}
        </group>
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

  useEffect(() => {
    if (ref.current) {
      const { setAzimuthalAngle } = ref.current
      setAzimuthalAngle(Math.PI / 4)
    }
  }, [])

  return {
    ref,
    onLeft: () => rotate(-Math.PI / 2),
    onRight: () => rotate(Math.PI / 2),
  }
}

const ControlsWrapper = styled("div", {
  position: "absolute",
  bottom: 24,
  left: 24,
  width: 180,
})

const WinContainer = styled("div", {
  position: "absolute",
  top: 24,
  width: "80vw",
  left: "50%",
  transform: "translateX(-50%)",
  textAlign: "center",

  borderWidth: 2,
  borderStyle: "solid",
  padding: 24,

  fontFamily: "monospace",

  backdropFilter: "blur(8px)",

  h2: { fontSize: 48 },
  p: { fontSize: 24 },

  variants: {
    redOrYellow: {
      "red-won": {
        color: "red",
        borderColor: "red",
      },
      "yellow-won": {
        color: "yellow",
        borderColor: "yellow",
      },
    },
  },
})

const GameButton = styled("button", {
  margin: 0,
  borderRadius: 2,
  padding: 4,

  fontFamily: "monospace",

  border: "1px solid rgb(241, 200, 146)",
  boxShadow: "0px 4px 1px 0px rgb(241, 200, 146)",

  "&:hover": {
    boxShadow: "0px 3px 0px 0px rgb(241, 200, 146)",
    transform: "translate(0, 1px)",
  },
  "&:active": {
    boxShadow: "0px 1px 0px 0px rgb(241, 200, 146)",
    transform: "translate(0, 3px)",
  },
})

const WinBanner = () => {
  const [gameState, setGameState] = useAtom(gameStateAtom)
  const setCells = useSetAtom(cellsAtom)

  if (gameState === "playing") return null

  const winText = gameState === "red-won" ? "Red Wins!" : "Yellow Wins!"

  const reset = () => {
    setCells([])
    setGameState("playing")
  }

  return (
    <WinContainer redOrYellow={gameState}>
      <h2>Game Over</h2>
      <p>{winText}</p>
      <GameButton onClick={reset}>New Game</GameButton>
    </WinContainer>
  )
}

const Plinth = () => (
  <RoundedBox scale={[7.2, 0.5, 7.2]} position={[0, -0.25, 0]}>
    <meshPhysicalMaterial specularIntensity={1} metalness={0.7} clearcoat={1} color={"#99aaff"} />
  </RoundedBox>
)
export default function App() {
  const { ref, onLeft, onRight } = useIsometricRotation()

  return (
    <>
      <Canvas>
        <color attach="background" args={["black"]} />
        <PerspectiveCamera makeDefault position={[15, 15, 15]} zoom={5} fov={90} />
        <ambientLight intensity={0.1} />
        <pointLight position={[10, 10, 10]} />
        <Suspense fallback={null}>
          <Center>
            <Room />
          </Center>
          <Plinth />
        </Suspense>
        <OrbitControls
          ref={ref}
          // minPolarAngle={Math.PI / 3.5}
          // maxPolarAngle={Math.PI / 3.5}
          enableRotate={true}
          enablePan={false}
          enableDamping={true}
          dampingFactor={0.6}
        />
      </Canvas>
      <ControlsWrapper>
        <GameButton onClick={onLeft}>Rotate Left</GameButton>
        <br />
        <br />
        <GameButton onClick={onRight}>Rotate Right</GameButton>
      </ControlsWrapper>
      <WinBanner />
    </>
  )
}
