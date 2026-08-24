create or replace function public.delete_account_data(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_profile_ids uuid[];
begin
  -- Verify the caller is deleting their own account.
  -- Called via userClient in the Edge Function so auth.uid() resolves from the JWT.
  if p_user_id != auth.uid() then
    raise exception 'not authorized: user_id does not match calling user';
  end if;

  -- Collect all profile IDs owned by this account.
  select array_agg(profile_id)
    into v_profile_ids
    from public.profile_relationships
   where account_id = p_user_id;

  -- Delete profiles. Cascades (ON DELETE CASCADE) handle:
  --   swing_analyses, subscriptions, activity_log, user_drills,
  --   user_achievements, user_stats, feedback, team_members
  if v_profile_ids is not null then
    delete from public.profiles
     where id = any(v_profile_ids);
  end if;

  -- Delete profile_relationships. FK to auth.users has no cascade — must be explicit.
  delete from public.profile_relationships
   where account_id = p_user_id;

  -- Delete coaching_traces. user_id references auth.users directly — no cascade.
  delete from public.coaching_traces
   where user_id = p_user_id;

end;
$$;

revoke execute on function public.delete_account_data(uuid) from public;
grant  execute on function public.delete_account_data(uuid) to authenticated;
