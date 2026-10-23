-- NULL follows the cube default: W×D horizontally, H×D vertically.
-- Existing owner-only UPDATE and shared SELECT policies cover this copy attribute.
alter table public.board_games_box_association
    add column box_face text check (box_face in ('wxd', 'hxd', 'wxh'));
comment on column public.board_games_box_association.box_face is
    'Visible box face; null uses the cube layout default. Stored independently per owned copy.';
