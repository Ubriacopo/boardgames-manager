import {Component} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {AuthService} from '../services/auth.service';
import {LibraryService} from '../services/library.service';

@Component({
    standalone: true,
    imports: [MatButtonModule, MatIconModule, RouterLink],
    templateUrl: './profile.component.html',
})
export class ProfileComponent {
    constructor(readonly auth: AuthService, readonly library: LibraryService,) {
    }
}
