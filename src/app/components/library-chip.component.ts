import {Component, Input} from '@angular/core';

@Component({
    selector: 'app-library-chip',
    standalone: true,
    host: {class: 'inline-flex min-w-0 max-w-full'},
    templateUrl: './library-chip.component.html',
})
export class LibraryChipComponent {
    @Input({required: true}) name = '';
    @Input() color = '#287f82';

    get backgroundColor(): string {
        return /^#[0-9a-fA-F]{6}$/.test(this.color) ? this.color : '#287f82';
    }

    get ink(): string {
        const channels = [1, 3, 5].map(start => parseInt(this.backgroundColor.slice(start, start + 2), 16) / 255)
                .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        return luminance > 0.179 ? '#000000' : '#ffffff';
    }
}
