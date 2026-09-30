import {Component, HostListener, OnInit} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {ActivatedRoute, Router} from '@angular/router';
import {renderMarkdown} from '../../utils/renderMarkdown';
import {LibraryService} from '../services/library.service';
import {ReviewService, type LocalReview} from '../services/review.service';

@Component({
    standalone: true,
    imports: [MatButtonModule, MatIconModule],
    templateUrl: './game-reviews.component.html',
})
export class GameReviewsComponent implements OnInit {
    bggId = 0;
    gameName = 'Game reviews';
    reviews: LocalReview[] = [];
    loading = true;
    loadingMore = false;
    hasMore = true;
    error = '';

    constructor(
        private readonly route: ActivatedRoute,
        readonly router: Router,
        private readonly library: LibraryService,
        private readonly reviewService: ReviewService,
    ) {}

    async ngOnInit(): Promise<void> {
        this.bggId = Number(this.route.snapshot.paramMap.get('bggId'));
        this.gameName = this.library.games().find((game) => game.bgg_id === this.bggId)?.name ?? this.gameName;
        await this.loadMore();
    }

    @HostListener('window:scroll')
    onScroll(): void {
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 320) {
            void this.loadMore();
        }
    }

    renderReview(body: string): string {
        return renderMarkdown(body);
    }

    writeReview(): void {
        void this.router.navigate(['/reviews', this.bggId, 'write']);
    }

    async loadMore(): Promise<void> {
        if (!this.hasMore || this.loadingMore) return;
        this.loadingMore = true;
        this.error = '';
        try {
            const page = await this.reviewService.page(this.bggId, this.reviews.length);
            this.reviews = [...this.reviews, ...page.reviews];
            this.hasMore = page.hasMore;
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Unable to load reviews.';
        } finally {
            this.loading = false;
            this.loadingMore = false;
        }
    }
}
