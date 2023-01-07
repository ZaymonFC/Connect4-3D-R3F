import { Vector3 } from "three"

const w = 4
const h = 4
const d = 4

export function enumerateWinningLines(): Vector3[][] {
  const lines: Vector3[][] = []

  // Rectilinears
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < w; x++) {
      const line = []
      for (let z = 0; z < h; z++) {
        line.push(new Vector3(x, y, z))
      }

      lines.push(line)
    }

    for (let z = 0; z < w; z++) {
      const line = []
      for (let x = 0; x < h; x++) {
        line.push(new Vector3(x, y, z))
      }

      lines.push(line)
    }
  }

  // Diagonals
  for (let y = 0; y < d; y++) {
    const line = []
    for (let x = 0; x < w; x++) {
      line.push(new Vector3(x, y, x))
    }

    lines.push(line)
  }

  for (let y = 0; y < d; y++) {
    const line = []
    for (let z = 0; z < w; z++) {
      line.push(new Vector3(z, y, w - z - 1))
    }

    lines.push(line)
  }

  // Columns

  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      const line = []
      for (let y = 0; y < h; y++) {
        line.push(new Vector3(x, y, z))
      }

      lines.push(line)
    }
  }

  function rotateLineInFourDirections(line: Vector3[]) {
    const lines = []
    lines.push(line)

    const l2 = [...line].map((v) =>
      v
        .clone()
        .applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
        .add(new Vector3(0, 0, w - 1)),
    )
    lines.push(l2)

    const l3 = [...line].map((v) =>
      v
        .clone()
        .applyAxisAngle(new Vector3(0, 1, 0), Math.PI)
        .add(new Vector3(w - 1, 0, w - 1)),
    )
    lines.push(l3)

    const l4 = [...line].map((v) =>
      v
        .clone()
        .applyAxisAngle(new Vector3(0, 1, 0), (3 * Math.PI) / 2)
        .add(new Vector3(w - 1, 0, 0)),
    )
    lines.push(l4)

    return lines
  }

  // Stairs
  for (let x = 0; x < w; x++) {
    const line = []
    for (let y = 0; y < h; y++) {
      line.push(new Vector3(x, y, y))
    }

    rotateLineInFourDirections(line).forEach((l) => lines.push(l))
  }

  const line = []
  for (let x = 0; x < w; x++) {
    line.push(new Vector3(x, x, x))
  }

  rotateLineInFourDirections(line).forEach((l) => lines.push(l))

  return lines
}
