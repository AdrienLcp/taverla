import { composeClassName } from '@adrienlcp/react-aria'
import type React from 'react'
import {
  Label,
  Slider as ReactAriaSlider,
  type SliderProps as ReactAriaSliderProps,
  SliderOutput,
  SliderThumb,
  SliderTrack
} from 'react-aria-components'

import './slider.sass'

type SliderProps = Omit<
  ReactAriaSliderProps<number>,
  'children' | 'orientation'
> & {
  /** Shown above the track; a slider without one is unreachable by name. */
  label: string
}

export const Slider: React.FC<SliderProps> = ({
  className,
  label,
  ...props
}) => (
  <ReactAriaSlider
    {...props}
    className={composeClassName(className, 'slider')}
    orientation='horizontal'
  >
    <div className='slider-header'>
      <Label>{label}</Label>
      <SliderOutput />
    </div>
    <SliderTrack>
      {({ state }) => (
        <>
          <span
            className='fill'
            style={{ '--fill': `${state.getThumbPercent(0) * 100}%` }}
          />
          <SliderThumb />
        </>
      )}
    </SliderTrack>
  </ReactAriaSlider>
)
