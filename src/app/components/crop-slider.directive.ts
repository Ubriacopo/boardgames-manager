import {Directive} from '@angular/core';

@Directive({
    selector: 'input[appCropSlider]',
    standalone: true,
    host: {
        class: `my-2.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-line
      focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-brand focus-visible:outline-offset-5
      [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none
      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2
      [&::-webkit-slider-thumb]:border-surface [&::-webkit-slider-thumb]:bg-brand
      [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_var(--forest)]
      [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full
      [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface
      [&::-moz-range-thumb]:bg-brand [&::-moz-range-thumb]:shadow-[0_0_0_1px_var(--forest)]`,
    },
})
export class CropSliderDirective {
}
