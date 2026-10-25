import {Component, OnDestroy, OnInit, computed, signal} from '@angular/core';
import {AuthService} from '../services/auth.service';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {getBggCatalog, type BggGameMetadata} from '../../utils/bggData';
import {makeSearchScorer} from '../../utils/search';
import {GameCoverService} from '../services/game-cover.service';
import {LibraryService} from '../services/library.service';
import {GameListRowComponent} from '../components/game-list-row.component';
import {CollectionAddService} from '../services/collection-add.service';
import {GameCatalogService} from '../services/game-catalog.service';
import {MatDialogModule} from '@angular/material/dialog';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';

@Component({
    standalone: true,
    imports: [FormsModule, GameListRowComponent, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule],
    templateUrl: './games.component.html',
})
export class GamesComponent implements OnInit, OnDestroy {
    readonly categories = ['All', 'Strategy', 'Family', 'Party', 'Thematic', 'Card game', 'Abstract', 'War', "Children's"];
    readonly catalog = signal<BggGameMetadata[]>([]);
    readonly query = signal('');
    private readonly searchQuery = signal('');
    private queryTimer?: ReturnType<typeof setTimeout>;
    readonly category = signal('All');
    readonly sort = signal<'rank' | 'rating' | 'popular' | 'newest'>('rank');
    readonly loading = signal(true);
    readonly error = signal('');
    readonly adding = signal<Record<number, boolean>>({});

    constructor(readonly library: LibraryService, readonly covers: GameCoverService, private readonly gameCatalog: GameCatalogService,
                private readonly collectionAdd: CollectionAddService, private readonly snackBar: MatSnackBar, readonly auth: AuthService) {
    }

    async add(game: BggGameMetadata, special = false): Promise<void> {
        if (this.adding()[game.bggId]) return;
        this.adding.update(state => ({...state, [game.bggId]: true}));
        try {
            const definition = await this.gameCatalog.ensureGame({
                bgg_id: game.bggId,
                bgg_url: `https://boardgamegeek.com/boardgame/${game.bggId}`,
                name: game.name,
                release_year: game.yearPublished ?? new Date().getFullYear(),
                image_url: this.covers.urls()[game.bggId] ?? null
            });
            await this.collectionAdd.add(definition, special);
        } catch (error) {
            this.snackBar.open(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to add this game.', 'Dismiss');
        } finally {
            this.adding.update(state => ({...state, [game.bggId]: false}));
        }
    }

    async ngOnInit(): Promise<void> {
        try {
            const [catalog, definitions] = await Promise.allSettled([getBggCatalog(), this.gameCatalog.loadDefinitions()]);
            if (catalog.status === 'rejected') throw catalog.reason;
            this.catalog.set(catalog.value);
            if (definitions.status === 'rejected') {
                this.snackBar.open('Saved game details could not be loaded. Showing BoardGameGeek catalog details.', 'Dismiss');
            }
        } catch (error) {
            this.error.set(error instanceof Error ? error.message : 'Unable to load the game catalog.');
        } finally {
            this.loading.set(false);
        }
    }

    setQuery(value: string): void {
        this.query.set(value);
        clearTimeout(this.queryTimer);
        this.queryTimer = setTimeout(() => this.searchQuery.set(value), 180);
    }

    ngOnDestroy(): void {
        clearTimeout(this.queryTimer);
    }

    coverUrl(game: BggGameMetadata): string | null {
        return this.covers.urls()[game.bggId] ?? this.gameCatalog.definitionFor('', game.bggId)?.image_url ?? null;
    }

    readonly results = computed(() => {
        const query = this.searchQuery().trim();
        const score = makeSearchScorer(query);
        const category = this.category();
        const sort = this.sort();
        return this.catalog()
                .map(game => this.gameCatalog.metadataFor(game))
                .filter(game => !game.isExpansion && (category === 'All' || game.themes.includes(category)))
                .map(game => ({game, score: query ? Math.max(score(game.name) * 1.1, score(game.searchText)) : 1}))
                .filter(result => result.score > 0)
                .sort((left, right) => {
                    if (query && left.score !== right.score) return right.score - left.score;
                    const a = left.game, b = right.game;
                    if (sort === 'rating') return (b.avgRating ?? 0) - (a.avgRating ?? 0);
                    if (sort === 'popular') return (b.usersRated ?? 0) - (a.usersRated ?? 0);
                    if (sort === 'newest') return (b.yearPublished ?? 0) - (a.yearPublished ?? 0);
                    return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
                }).slice(0, 100).map(result => result.game);
    });

}
