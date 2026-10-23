-- Existing library ownership policies also protect color updates.
alter table public.libraries
    add column color text not null default '#287f82'
        constraint libraries_color_hex check (color ~ '^#[0-9a-fA-F]{6}$');
