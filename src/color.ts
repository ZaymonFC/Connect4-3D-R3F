export const rgbToHexColor = ([r, g, b]: [number, number, number]) => {
  console.log(r, g, b)
  const hex = (x: number) => x.toString(16).padStart(2, "0")
  console.log(hex(r), hex(g), hex(b))
  return `#${hex(r)}${hex(g)}${hex(b)}`
}
