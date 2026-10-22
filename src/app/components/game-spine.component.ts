import { Component, Input } from '@angular/core';

@Component({
  selector: 'span[app-game-spine]',
  standalone: true,
  host: {
    class: `relative flex flex-none items-center justify-center overflow-hidden bg-accent
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
                 rounded-md border-2 border-brand bg-white px-[5px] py-[3px] text-center text-[.85rem]
                 leading-[1.3] text-[#202020] uppercase
                 [max-block-size:calc(100%_-_4px)] [max-inline-size:calc(100%_-_8px)]">{{ name }}</span>
  `,
})
export class GameSpineComponent {
  @Input({ required: true }) name = '';
  @Input() imageUrl: string | null = null;
  @Input() horizontal = false;
  @Input() spineDraggable = false;
}
