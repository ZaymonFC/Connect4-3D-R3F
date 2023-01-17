const hex = (x: number) => x.toString(16).padStart(2, "0")

export const rgbToHexColor = ([r, g, b]: [number, number, number]) => `#${hex(r)}${hex(g)}${hex(b)}`

export const randomHexcode = () =>
  "#" +
  Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")
