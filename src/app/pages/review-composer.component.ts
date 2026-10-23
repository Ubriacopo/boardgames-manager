import {Component, OnInit, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {ActivatedRoute, Router} from '@angular/router';
import {QuillModule} from 'ngx-quill';
import {LibraryService} from '../services/library.service';
import {ReviewService} from '../services/review.service';

@Component({
    standalone: true,
    imports: [FormsModule, MatButtonModule, MatIconModule, QuillModule],
    templateUrl: './review-composer.component.html',
})
export class ReviewComposerComponent implements OnInit {
    bggId = 0;
    gameName = 'Game';
    rating = 8;
    body = '';
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly error = signal('');
    readonly editorModules = {
        toolbar: [['bold', 'italic', 'underline'], [{list: 'ordered'}, {list: 'bullet'}], ['blockquote', 'link'], ['clean']],
    };

    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly library: LibraryService,
        private readonly reviews: ReviewService,
    ) {}

    async ngOnInit(): Promise<void> {
        this.bggId = Number(this.route.snapshot.paramMap.get('bggId'));
        this.gameName = this.library.games().find((game) => game.bgg_id === this.bggId)?.name ?? this.gameName;
        try {
            const review = await this.reviews.ownReview(this.bggId);
            if (review) {
                this.rating = review.rating;
                this.body = review.body;
            }
        } catch (error) {
            this.error.set(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to open the review editor.');
        } finally {
            this.loading.set(false);
        }
    }

    cancel(): void {
        void this.router.navigate(['/reviews', this.bggId]);
    }

    async save(): Promise<void> {
        if (this.loading() || this.saving()) return;
        if (!this.body.replace(/<[^>]*>/g, '').trim()) {
            this.error.set('Write a short review first.');
            return;
        }
        this.saving.set(true);
        this.error.set('');
        try {
            await this.reviews.save(this.bggId, Number(this.rating), this.body);
            await this.router.navigate(['/reviews', this.bggId]);
        } catch (error) {
            this.error.set(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to publish your review.');
        } finally {
            this.saving.set(false);
        }
    }
}
