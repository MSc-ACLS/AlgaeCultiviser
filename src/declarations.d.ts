declare module '*.svg' {
  const content: string
  export default content
}

// cubic-spline has no types, declare minimal module to allow importing
declare module 'cubic-spline' {
  export default class CubicSpline {
    constructor(xs: number[], ys: number[])
    at(x: number): number
  }
}