# use-animation

a react hook for reactive animations + continuous UI, powered by rxjs

Usage: 

```tsx
import { useAnimation, useObservable, interpolator } from 'use-animation'
import { useKeyDown } from 'use-input'

const anim = interpolator(0, 1, "easeOutCubic")
const MyComponent = () => {
  const target = useRef(null)

  const scale = useObservable(1)
  useAnimation(scale, anim, 500,
    (v) => {
      target.current.style.transform = `scale(${v})`
    },
  )
  
  useKeyDown(KEYS.up_arrow, () => {
    scale.swap(s => s + 0.5)
  })
  
  return <div ref={target} style={{ width: '32px', height: '32px', backgroundColor: 'red' }} />
}
```

## Usage with react-three-fiber

```tsx
import { useObservable, interpolator } from 'use-animation'
import { useAnimation } from 'use-animation/three'
import { useKeyDown } from 'use-input'

const anim = interpolator(0, 1, "easeOutCubic")
const MyComponent = () => {
  const mesh = React.useRef(null)

  const scale = useObservable(1)
  useAnimation(scale, anim, 500,
    (v) => {
      mesh.current.scale.x = target.current.scale.y = v;
    },
  )
  
  useKeyDown(KEYS.up_arrow, () => {
    scale.swap(s => s + 0.5)
  })
  
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[4, 4]} />
      <meshPhongMaterial color={"red"} />
    </mesh>
  )
}
```

## Declaring Animations

`useAnimated` operates using two base primitives: observable values to animate (`useObservable`) and interpolation curves (`interpolator(0, 1, 'linear')`). 

The simplest animation definition might look like:

```tsx
  const linear = interpolator(0, 1, 'linear')
  const value = useObservable(1)
  useAnimation(value, linear, 200, console.log)
```

This means, in english, watch `value` and when it changes animate over `200ms` to the new value using a `linear` interpolation from `0%` to `100%` and log the intermediate values to the console.

We can get fancier, with a little overshoot and rebound animation:

```tsx
  const bounce = sequence(interpolator(0, 1.2, 'easeOutCubic'), interpolator(1.2, 1, 'easeOutCubic'))
  const value = useObservable(1)
  useAnimation(value, bounce, 200, console.log)
```

This is very similar except that now, over `200ms` we will animate first from `0%` to `120%` then back from `120%` to `100%` which looks fun and bouncy. 

This animation algebra allows all sorts of strange curves, handling the oddly specific problem of animating a value away from and back to the starting point:

```tsx
  const thereAndBack = sequence(interpolator(0, 1, 'easeOutCubic'), interpolator(1, 0, 'easeOutCubic'))
  const value = useObservable(1)
  useAnimation(value, thereAndBack, 200, console.log)
```

Now, the `delta` of `value` will be the amplitude of this animation away from and back to the original `value`. `value` will always return to its initial state of `1`.

## Comparison with existing frameworks

`useAnimated` operates in a similar domain to `framer-motion` and `react-spring`. It was originally conceived as a way of achieving [continuous UI](https://github.com/dmvaldman/samsara) via functional reactive programming working in `React` + `rxjs` + `react-three-fiber`. It aims to provide flexible control over animation triggers, cancellations, scheduling and interpolation schemes. It does not use springs internally, though it could be adapted to do so by implementing a spring `interpolator`.

In contrast to both `framer-motion` and `react-spring` this library does not introduce wrapped components a la `<motion.div />` or `<animated.div />`. Instead we aim for the lowest overhead between intent streams -> rendered outputs, this is achieved by directly mutating DOM node or Three.js properties (in the case of `react-three-fiber`). This may seem at odds with the declarative programming encouraged by React but I would argue it is not.

[cycle.js](https://cycle.js.org/) accurately shows that animation is a *side-effect* that is handled downstream of user intentions and actions. If the user's actions are `sources` then animation is nothing more than a `sink`, we are free to drop into performant imperative code where needed. To me, this is preferable to magic blackbox components.

If this isn't your cup of tea you can use my reactive input handling library `use-input` with both `framer-motion` and `react-spring` trivially.

e.g.

```tsx
  const scale = useSpring(1)

  useKeyDown(KEYS.up_arrow, () => {
    scale.set(scale.get() + 2)
  })

  useKeyDown(KEYS.down_arrow, () => {
    scale.set(scale.get() - 2)
  })

  return <motion.div style={{ scale, width: "32px", height: "32px", backgroundColor: "red" }} />
```

### Performance

My very primitive and insufficient testing suggests that `useAnimated` is roughly as performant as `framer-motion`, `react-spring` and `velocity.js` in simple cases. 

## Custom Stream Pipelines

### Setting Animated Values from Streams

```tsx

const angle = useObservable(0)
  
// ...

useEffect(() => {
  const s = interval(500)
    .pipe(map((t) => Math.random() * Math.PI * 2))
    .subscribe(angle.set)
  return () => s.unsubscribe()
}, [angle])

```

### Consuming, Merging, Summing Intent Streams

You can directly consume the source streams from `use-input`, these currently include `keydown$`, `keyup$`, `key$`, `mousemove$`, `mousemovenormalised$` and `mousemovedelta$`.

```tsx
const angle = useObservable(0)
   
// ...

useEffect(() => {
  const s = combineLatest([
    mousemovenormalised$.pipe(
      sampleTime(100),
      map(([x]) => Math.PI * 2 * Math.sin(x * Math.PI)),
    ),
    interval(100),
  ])
    .pipe(map(([angle, time]) => angle + time / 5.0))
    .subscribe(angle.set)
  return () => s.unsubscribe()
}, [angle])
```
