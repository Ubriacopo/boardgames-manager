import {DecimalPipe, Location} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {ActivatedRoute} from '@angular/router';
import {
    getBggMetadataByIds,
    getBggOverview,
    getBggReviews,
    type BggGameMetadata,
    type BggOverview,
    type BggReview,
} from '../../utils/bggData';
import {ReviewService, type LocalReviewSummary} from '../services/review.service';

@Component({
    standalone: true,
    imports: [DecimalPipe, FormsModule, MatButtonModule, MatIconModule],
    templateUrl: './game-reviews.component.html',
})
export class GameReviewsComponent implements OnInit {
    bggId = 0;
    game?: BggGameMetadata;
    overview?: BggOverview;
    bggReviews: BggReview[] = [];
    local: LocalReviewSummary = {average: null, count: 0, rank: null, reviews: []};
    source: 'local' | 'bgg' = 'local';
    rating = 8;
    body = '';
    error = '';
    loading = true;
    saving = false;
    focusForm = false;

    constructor(
        private readonly location: Location,
        private readonly route: ActivatedRoute,
        private readonly reviews: ReviewService,
    ) {
    }

    async ngOnInit(): Promise<void> {
        this.bggId = Number(this.route.snapshot.paramMap.get('bggId'));
        this.source = this.route.snapshot.queryParamMap.get('source') === 'bgg' ? 'bgg' : 'local';
        this.focusForm = this.route.snapshot.queryParamMap.has('write');
        const results = await Promise.allSettled([
            getBggMetadataByIds([this.bggId]),
            getBggOverview(this.bggId),
            getBggReviews(this.bggId),
            this.reviews.summary(this.bggId),
        ]);
        if (results[0].status === 'fulfilled') this.game = results[0].value.get(this.bggId);
        if (results[1].status === 'fulfilled') this.overview = results[1].value;
        if (results[2].status === 'fulfilled') this.bggReviews = results[2].value;
        if (results[3].status === 'fulfilled') this.local = results[3].value;
        this.loading = false;
    }

    back(): void {
        this.location.back();
    }

    async submit(): Promise<void> {
        if (!this.body.trim()) {
            this.error = 'Write a short review first.';
            return;
        }
        this.saving = true;
        this.error = '';
        try {
            await this.reviews.save(this.bggId, this.rating, this.body);
            this.body = '';
            this.local = await this.reviews.summary(this.bggId);
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Unable to save your review.';
        } finally {
            this.saving = false;
        }
    }
}
