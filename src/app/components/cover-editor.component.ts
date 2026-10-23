import {CropSliderDirective} from './crop-slider.directive';
import {Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild, signal} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {MatExpansionModule} from '@angular/material/expansion';
import {FormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {GameCoverService, type ArtworkKind} from '../services/game-cover.service';
import {cropRectangle} from '../../utils/imageCrop';

@Component({
    standalone: true,
    imports: [CropSliderDirective, DecimalPipe, FormsModule, MatDialogModule, MatButtonModule, MatExpansionModule],
    templateUrl: './cover-editor.component.html',
})
export class CoverEditorComponent implements OnInit, OnDestroy {
    file: File | null = null;
    zoom = 1;
    horizontal = 50;
    vertical = 50;
    shape: 'portrait' | 'landscape' | 'square' | 'original' = 'portrait';
    readonly cropExpanded = signal(false);
    readonly saving = signal(false);
    readonly loading = signal(false);
    readonly ready = signal(false);
    readonly error = signal('');
    private image: HTMLImageElement | null = null;
    private canvas?: HTMLCanvasElement;
    private objectUrl?: string;
    private loadVersion = 0;
    private drag?: { id: number; x: number; y: number };

    @ViewChild('cropCanvas') set cropCanvas(element: ElementRef<HTMLCanvasElement> | undefined) {
        this.canvas = element?.nativeElement;
        this.drawPreview();
    }

    constructor(
            @Inject(MAT_DIALOG_DATA) readonly data: {
                bggId: number;
                name: string;
                imageUrl?: string | null;
                kind?: ArtworkKind
            },
            readonly dialog: MatDialogRef<CoverEditorComponent>,
            private readonly covers: GameCoverService,
    ) {
        if (data.kind === 'wallpaper') this.shape = 'landscape';
        if (data.kind === 'logo' || data.kind === 'box-side') this.shape = 'original';
    }

    get artworkLabel(): string {
        return this.data.kind === 'box-side' ? 'box side' : this.data.kind ?? 'cover';
    }

    async ngOnInit(): Promise<void> {
        if (!this.data.imageUrl) return;
        await this.loadImage(this.data.imageUrl, true);
    }

    get aspectRatio(): number {
        if (this.shape === 'landscape') return 16 / 9;
        if (this.shape === 'square') return 1;
        if (this.shape === 'original' && this.image) return this.image.naturalWidth / this.image.naturalHeight;
        return 4 / 5;
    }

    get previewWidth(): string {
        return `min(100%, ${340 * this.aspectRatio}px)`;
    }

    chooseFile(event: Event): void {
        this.clearPreview();
        this.file = (event.target as HTMLInputElement).files?.[0] ?? null;
        if (!this.file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(this.file.type) || this.file.size > 5 * 1024 * 1024) {
            this.error.set('Choose a JPG, PNG, or WebP image up to 5 MB.');
            return;
        }
        this.objectUrl = URL.createObjectURL(this.file);
        void this.loadImage(this.objectUrl);
    }

    private async loadImage(source: string, currentCover = false): Promise<void> {
        const version = ++this.loadVersion;
        this.loading.set(true);
        const image = new Image();
        if (currentCover) image.crossOrigin = 'anonymous';
        try {
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    image.src = '';
                    reject(new Error('Image loading timed out.'));
                }, 15000);
                image.onload = () => {
                    clearTimeout(timeout);
                    resolve();
                };
                image.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Unable to load image.'));
                };
                image.src = source;
            });
            if (version !== this.loadVersion) return;
            if (!image.naturalWidth || !image.naturalHeight) throw new Error('The image is empty.');
            this.image = image;
            this.resetCrop();
            this.ready.set(true);
        } catch {
            if (version === this.loadVersion) this.error.set(currentCover
                    ? `The current ${this.artworkLabel} could not be opened for cropping. Browse to upload a replacement image.`
                    : 'This image could not be opened. Please choose another file.');
        } finally {
            if (version === this.loadVersion) this.loading.set(false);
        }
    }

    resetCrop(): void {
        this.zoom = 1;
        this.horizontal = 50;
        this.vertical = 50;
        this.drawPreview();
    }

    changeShape(shape: 'portrait' | 'landscape' | 'square' | 'original'): void {
        this.shape = shape;
        this.resetCrop();
    }

    drawPreview(): void {
        if (!this.canvas || !this.image) return;
        const crop = this.currentCrop();
        const width = Math.max(1, Math.round(Math.min(640, 800 * this.aspectRatio)));
        this.canvas.width = width;
        this.canvas.height = Math.max(1, Math.round(width / this.aspectRatio));
        const context = this.canvas.getContext('2d', {alpha: true});
        if (!context) return;
        context.imageSmoothingQuality = 'high';
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        context.drawImage(this.image, crop.x, crop.y, crop.width, crop.height, 0, 0, this.canvas.width, this.canvas.height);
    }

    startDrag(event: PointerEvent): void {
        if (this.saving() || !this.image || (event.pointerType === 'mouse' && event.button !== 0)) return;
        const canvas = event.currentTarget as HTMLCanvasElement;
        canvas.setPointerCapture(event.pointerId);
        this.drag = {id: event.pointerId, x: event.clientX, y: event.clientY};
        event.preventDefault();
    }

    moveDrag(event: PointerEvent): void {
        if (!this.drag || this.drag.id !== event.pointerId || !this.image || this.saving()) return;
        const bounds = (event.currentTarget as HTMLCanvasElement).getBoundingClientRect();
        const crop = this.currentCrop();
        const availableX = this.image.naturalWidth - crop.width;
        const availableY = this.image.naturalHeight - crop.height;
        if (availableX > 0) this.horizontal = this.clamp(this.horizontal - (event.clientX - this.drag.x) * crop.width / bounds.width / availableX * 100);
        if (availableY > 0) this.vertical = this.clamp(this.vertical - (event.clientY - this.drag.y) * crop.height / bounds.height / availableY * 100);
        this.drag = {id: event.pointerId, x: event.clientX, y: event.clientY};
        this.drawPreview();
    }

    endDrag(event: PointerEvent): void {
        if (this.drag?.id !== event.pointerId) return;
        const canvas = event.currentTarget as HTMLCanvasElement;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        this.drag = undefined;
    }

    private currentCrop() {
        return cropRectangle(this.image!.naturalWidth, this.image!.naturalHeight, this.aspectRatio, this.zoom, this.horizontal / 100, this.vertical / 100);
    }

    private clamp(value: number): number {
        return Math.max(0, Math.min(100, value));
    }

    private async croppedFile(): Promise<File> {
        if (!this.image) throw new Error('Load an image before cropping.');
        const crop = this.currentCrop();
        const wallpaper = this.data.kind === 'wallpaper';
        const scale = Math.min(1, (wallpaper ? 2560 : 1600) / crop.width, (wallpaper ? 1440 : 2000) / crop.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(crop.width * scale));
        canvas.height = Math.max(1, Math.round(crop.height * scale));
        const context = canvas.getContext('2d', {alpha: true});
        if (!context) throw new Error('Your browser could not prepare the cropped image.');
        context.imageSmoothingQuality = 'high';
        const logo = this.data.kind === 'logo';
        const type = logo ? 'image/png' : 'image/webp';
        const encode = async (): Promise<Blob> => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(this.image!, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
            return new Promise<Blob>((resolve, reject) => canvas.toBlob(
                    result => result ? resolve(result) : reject(new Error('The cropped image could not be saved.')),
                    type, 0.92,
            ));
        };
        // Logos use lossless PNG so transparent and semi-transparent edges survive cropping.
        let blob = await encode();
        while (logo && blob.size > 5 * 1024 * 1024 && canvas.width > 1 && canvas.height > 1) {
            canvas.width = Math.max(1, Math.floor(canvas.width * 0.8));
            canvas.height = Math.max(1, Math.floor(canvas.height * 0.8));
            context.imageSmoothingQuality = 'high';
            blob = await encode();
        }
        return new File([blob], `${this.data.kind ?? 'cover'}-${this.data.bggId}.${blob.type === 'image/webp' ? 'webp' : 'png'}`, {type: blob.type});
    }

    async save(): Promise<void> {
        if (this.saving() || this.loading() || !this.ready()) return;
        this.saving.set(true);
        this.error.set('');
        this.dialog.disableClose = true;
        try {
            const file = await this.croppedFile();
            await this.covers.save(this.data.bggId, '', file, this.data.kind ?? 'cover');
            this.dialog.close(true);
        } catch (error) {
            this.error.set(error && typeof error === 'object' && 'message' in error ? String(error.message) : `Unable to update this ${this.artworkLabel}.`);
        } finally {
            this.saving.set(false);
            this.dialog.disableClose = false;
        }
    }

    private clearPreview(): void {
        this.loadVersion++;
        this.drag = undefined;
        this.cropExpanded.set(false);
        this.ready.set(false);
        this.loading.set(false);
        this.error.set('');
        this.image = null;
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = undefined;
    }

    ngOnDestroy(): void {
        this.clearPreview();
    }
}
