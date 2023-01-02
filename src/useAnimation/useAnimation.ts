import { EaseFn, default as easing } from "./ease"
import { concat, merge, Observable, of, Subject } from "rxjs"
import { delay, flatMap, map, share, switchMap, take, takeUntil, takeWhile, tap } from "rxjs/operators"
import * as React from "react"
import { frames$, useFrameStream } from "./frameStream"

export function interpolator(from: number, to: number, easeFn: EaseFn) {
  const e: (t: number) => number = easing[easeFn]
  return {
    end: to,
    sample: (t: number) => from + (to - from) * e(t),
  }
}

export function mapInterpolator(i: Interpolator, from: number, to: number) {
  return {
    end: to,
    sample: (t: number) => from + (to - from) * i.sample(t),
  }
}

export type Interpolator = ReturnType<typeof interpolator>

export function sequence(a: Interpolator, b: Interpolator) {
  const sample = (t: number) => {
    if (t < 0.5) {
      return a.sample(t * 2)
    } else {
      return b.sample((t - 0.5) * 2)
    }
  }

  return {
    sample,
    end: b.end,
  }
}

function sequenceN(...i: Interpolator[]) {
  const n = i.length

  const sample = (t: number) => {
    const slice = 1 / n
    const index = t % slice
    // cut t into n segments
    // pick correct interpolator based on t
  }
}

export type Animatable = number

export type ObservableSource = {
  changes: Subject<Animatable>
  value: () => Animatable
  swap: (swapFn: (v: Animatable) => Animatable) => void
  set: (v: Animatable) => void
}

export const useObservable = (v: Animatable): ObservableSource => {
  const val = React.useRef(v)

  const subject = new Subject<Animatable>()

  return {
    changes: subject,
    value: () => val.current,
    swap: (swapFn: (v: Animatable) => Animatable) => {
      val.current = swapFn(val.current)
      subject.next(val.current)
    },
    set: (v: Animatable) => {
      val.current = v
      subject.next(v)
    },
  }
}

export const useObservableState = (v: Animatable): ObservableSource => {
  const [val, setVal] = React.useState(v)

  const subject = React.useRef(new Subject<Animatable>())

  return React.useMemo(
    () => ({
      changes: subject.current,
      value: () => val,
      swap: (swapFn: (v: Animatable) => Animatable) => {
        subject.current.next(swapFn(val))
        setVal(swapFn)
      },
      set: (v: Animatable) => {
        subject.current.next(v)
        setVal(v)
      },
    }),
    [val, setVal],
  )
}

// frames$.subscribe(console.log)

export const useAnimation = (source: ObservableSource, interpolator: Interpolator, duration: number, sink: (v: Animatable) => void) => {
  const underlying = React.useRef(source.value())

  React.useEffect(() => {
    sink(underlying.current)

    const sub = source.changes
      .pipe(
        switchMap((v) => {
          const baseTime = Date.now()

          return concat(
            frames$.pipe(
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
  }, [duration, source, sink, interpolator])
}
