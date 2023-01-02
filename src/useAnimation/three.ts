import { EaseFn, default as easing } from "./ease"
import { concat, merge, Observable, of, Subject } from "rxjs"
import { delay, flatMap, map, share, switchMap, take, takeUntil, takeWhile, tap } from "rxjs/operators"
import * as React from "react"
import { useFrameStream } from "./frameStream"
import { Animatable, Interpolator, mapInterpolator, ObservableSource } from "./useAnimation"

export const useAnimation = (source: ObservableSource, interpolator: Interpolator, duration: number, sink: (v: Animatable) => void) => {
  const underlying = React.useRef(source.value())

  const frames$ = useFrameStream()

  React.useEffect(() => {
    sink(underlying.current)

    const sub = source.changes
      .pipe(
        switchMap((v) => {
          const baseTime = Date.now()

          return concat(
            frames$.current.pipe(
              share(),
              map((dt) => (Date.now() - baseTime) / duration),
              takeWhile((t) => t < 1),
            ),
            of(1),
          ).pipe(map(mapInterpolator(interpolator, underlying.current, v).sample))
        }),
      )
      .subscribe((v) => {
        underlying.current = v
        sink(v)
      })

    return () => {
      sub.unsubscribe()
    }
  }, [duration, source, sink, interpolator, frames$])
}
