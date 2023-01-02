import { useFrame, useThree } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { Observable, of, Subject } from "rxjs"
import { expand, filter, map, share } from "rxjs/operators"

// Yoinked from https://www.learnrxjs.io/learn-rxjs/recipes/gameloop

export interface IFrameData {
  frameStartTime: number
  deltaTime: number
}

/**
 * clampTo30FPS(frame)
 *
 * @param frame - {IFrameData} the frame data to check if we need to clamp to max of
 *  30fps time.
 *
 * If we get sporadic LONG frames (browser was navigated away or some other reason the frame takes a while) we want to throttle that so we don't JUMP ahead in any deltaTime calculations too far.
 */
export const clampTo30FPS = (frame: IFrameData) => {
  if (frame.deltaTime > 1 / 30) {
    frame.deltaTime = 1 / 30
  }
  return frame
}

export const clampTo60FPS = (frame: IFrameData) => {
  if (frame.deltaTime > 1 / 60) {
    frame.deltaTime = 1 / 60
  }
  return frame
}

/**
 * This function returns an observable that will emit the next frame once the
 * browser has returned an animation frame step. Given the previous frame it calculates
 * the delta time, and we also clamp it to 30FPS in case we get long frames.
 */
const calculateStep: (prevFrame?: IFrameData) => Observable<IFrameData> = (prevFrame?: IFrameData) => {
  return new Observable((observer) => {
    requestAnimationFrame((frameStartTime) => {
      console.log("raf")

      // Millis to seconds
      const deltaTime = prevFrame ? (frameStartTime - prevFrame.frameStartTime) / 1000 : 0
      observer.next({
        frameStartTime,
        deltaTime,
      })
    })
  })
}

// This is our core stream of frames. We use expand to recursively call the
//  `calculateStep` function above that will give us each new Frame based on the
//  window.requestAnimationFrame calls. Expand emits the value of the called functions
//  returned observable, as well as recursively calling the function with that same
//  emitted value. This works perfectly for calculating our frame steps because each step
//  needs to know the lastStepFrameTime to calculate the next. We also only want to request
//  a new frame once the currently requested frame has returned.
export const frames$ = of(undefined).pipe(
  expand((val) => calculateStep(val)),
  // Expand emits the first value provided to it, and in this
  //  case we just want to ignore the undefined input frame
  filter((frame) => frame !== undefined),
  map((frame: IFrameData) => frame.deltaTime),
  share(),
)

export const useFrameStream = () => {
  const s = useRef<Subject<number>>(new Subject<number>())
  useFrame(({ clock }) => {
    s.current.next(clock.getDelta())
  })
  return s
}
