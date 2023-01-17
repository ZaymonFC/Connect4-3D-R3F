import { Center, Cylinder, Line, OrbitControls, PerspectiveCamera, RoundedBox, Torus } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import { styled } from "@stitches/react"
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai"
import { useControls } from "leva"
import React, { Suspense, useEffect, useState } from "react"
import { Vector3 } from "three"
import { grid2 } from "./grid"
import { randomHexcode } from "./helpers"
import { useCameraControls } from "./useCameraControls"
import { checkForWin, enumerateWinningLines } from "./winningLines"

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

// --- Constants and Module Scope Variables ---
const CELL_COUNT = 4
const CELL_SPACING = 1.66
const BASE_OFFSET = 0.25
const winningLines = enumerateWinningLines()

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

const upNormal = new Vector3(0, 1, 0)
const newCellPosition = (clickedCell, _) => clickedCell.clone().add(upNormal)

const useTrackGameState = (redWinningLine, yellowWinningLine) => {
  const setGameState = useSetAtom(gameStateAtom)

  useEffect(() => {
    if (redWinningLine) {
      setGameState("red-won")
    } else if (yellowWinningLine) {
      setGameState("yellow-won")
    } else {
      setGameState("playing")
    }
  }, [redWinningLine, yellowWinningLine, setGameState])
}

const useUndo = () => {
  const setCells = useSetAtom(cellsAtom)

  return () =>
    setCells((cells) => {
      if (cells.length === 0) return cells
      return [...cells].slice(0, -1)
    })
}

function inWinningLine(cell, winningLines) {
  if (!winningLines) return false

  const id = (x) => x

  const winningCells = winningLines.flatMap(id)
  return winningCells.some((lineCell) => lineCell.equals(cell))
}

function DebugLines({ winningLines }) {
  const { showLines } = useControls({ showLines: false })
  if (!showLines) return null

  return (
    <group position={[0, BASE_OFFSET, 0]}>
      {winningLines.map((l) => {
        const col = randomHexcode()
        return (
          <Line lineWidth={1} points={l.map((p) => p.clone().multiplyScalar(CELL_SPACING))} color={col} key={col} />
        )
      })}
    </group>
  )
}

function Room() {
  const { cells, addCell } = useCells()
  const redCells = useAtomValue(redCellsAtom)
  const yellowCells = useAtomValue(yellowCellsAtom)
  const bases = grid2(CELL_COUNT, CELL_COUNT)

  const takingTurn = cells.length % 2 === 0 ? "red" : "yellow"
  const redWinningLines = checkForWin(redCells, winningLines)
  const yellowWinningLines = checkForWin(yellowCells, winningLines)

  useTrackGameState(redWinningLines, yellowWinningLines)

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
              highlight={inWinningLine(v, redWinningLines) || inWinningLine(v, yellowWinningLines)}
            />
          ))}
        </group>
        {/* <DebugLines winningLines={winningLines} /> */}
      </group>
    </>
  )
}

const ControlsWrapper = styled("div", {
  position: "absolute",
  bottom: 24,
  left: 24,
  width: 180,
})

const WinContainer = styled("div", {
  position: "absolute",
  top: "3vh",
  width: "90vw",
  left: "50%",
  transform: "translateX(-50%)",
  textAlign: "center",

  borderWidth: 2,
  borderStyle: "solid",

  borderRadius: 4,

  padding: 24,

  fontFamily: "monospace",

  backdropFilter: "blur(8px)",

  h2: { fontSize: 48 },
  p: { fontSize: 24 },

  variants: {
    redOrYellow: {
      "red-won": { color: "red", borderColor: "red" },
      "yellow-won": { color: "yellow", borderColor: "yellow" },
    },
  },
})

const GameButton = styled("button", {
  margin: 0,
  borderRadius: 2,
  padding: 6,
  paddingInline: 8,

  fontFamily: "monospace",
  fontSize: 16,

  color: "white",
  backgroundColor: "#99aaff",

  border: "1px solid rgb(124, 139, 217)",
  boxShadow: "0px 4px 1px 0px rgb(124, 139, 217)",

  "&:hover": {
    boxShadow: "0px 3px 0px 0px rgb(124, 139, 217)",
    transform: "translate(0, 1px)",
  },
  "&:active": {
    boxShadow: "0px 1px 0px 0px rgb(124, 139, 217)",
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
  const { ref, onLeft, onRight } = useCameraControls()
  const onUndo = useUndo()

  return (
    <>
      <Canvas>
        <color attach="background" args={["black"]} />
        <PerspectiveCamera makeDefault position={[15, 15, 15]} zoom={5} fov={90} />
        <ambientLight intensity={0.1} />
        <pointLight position={[10, 10, 10]} />
        <Suspense fallback={null}>
          <group position={[0, -1, 0]}>
            <Center>
              <Room />
            </Center>
            <Plinth />
          </group>
        </Suspense>
        <OrbitControls ref={ref} enableRotate={true} enablePan={false} enableDamping={true} dampingFactor={0.4} />
      </Canvas>
      <ControlsWrapper>
        <GameButton onClick={onUndo}>Undo</GameButton>
        <br />
        <br />
        <GameButton onClick={onLeft}>Rotate Left</GameButton>
        <br />
        <br />
        <GameButton onClick={onRight}>Rotate Right</GameButton>
      </ControlsWrapper>
      <WinBanner />
    </>
  )
}
