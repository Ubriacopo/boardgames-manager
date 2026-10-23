alter table public.social_profiles
    add column avatar_url text
        check (avatar_url is null or avatar_url ~ '^https://[^[:space:]]+$');

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-pictures', 'profile-pictures', true, 5242880, array ['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
-- New immutable paths avoid overwriting a cached photo. Each user owns their folder.
create policy "Collectors upload their own profile pictures" on storage.objects
    for insert to authenticated with check (
    bucket_id = 'profile-pictures'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );
-- Existing social_profiles UPDATE policies permit only the profile owner to set avatar_url.
