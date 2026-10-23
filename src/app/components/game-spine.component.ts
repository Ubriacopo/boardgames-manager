import { Component, Input } from '@angular/core';

@Component({
  selector: 'span[app-game-spine]',
  standalone: true,
  host: {
    // With the spine's writing mode, cqb measures thickness and cqi measures title length.
    class: `relative flex flex-none items-center justify-center overflow-hidden bg-accent [container-type:size]
      font-bold text-white [writing-mode:vertical-rl]
      even:bg-brand [&:nth-child(3n)]:bg-[var(--mustard)] [&:nth-child(3n)]:text-ink
      [&.horizontal]:self-end [&.horizontal]:[writing-mode:horizontal-tb]`,
    '[class.horizontal]': 'horizontal',
    '[class.cursor-grab]': 'spineDraggable',
    '[class.cursor-default]': '!spineDraggable',
  },
  template: `
    @if (imageUrl) {
      <img class="absolute inset-0 block size-full flex-none select-none object-cover"
           [src]="imageUrl" alt="" draggable="false">
    }
    <span class="pointer-events-none relative flex-none overflow-hidden text-ellipsis whitespace-nowrap
                 rounded-[min(.375rem,12cqb)] border-solid border-brand bg-white text-center
                 leading-[1.2] text-[#202020] uppercase [font-size:min(1.25rem,52cqb)]
                 [border-width:min(2px,4cqb)] [padding-block:min(.25rem,8cqb)] [padding-inline:min(.3125rem,3cqi)]
                 [max-block-size:92cqb] [max-inline-size:calc(100cqi_-_min(.5rem,10cqi))]">{{ name }}</span>
  `,
})
export class GameSpineComponent {
  @Input({ required: true }) name = '';
  @Input() imageUrl: string | null = null;
  @Input() horizontal = false;
  @Input() spineDraggable = false;
}
