create or replace function public.complete_silver_purchase(
  p_account_id  uuid,
  p_profile_id  uuid,
  p_slot_number int
)
returns void
language plpgsql
security definer
as $$
begin
  -- Enforce that callers can only complete purchases for their own account
  if p_account_id != auth.uid() then
    raise exception 'not authorized: account_id does not match calling user';
  end if;

  -- 1. Assign the slot to this profile relationship.
  update public.profile_relationships
     set slot_number = p_slot_number
   where account_id = p_account_id
     and profile_id = p_profile_id;

  if not found then
    raise exception 'profile_relationship not found for account % / profile %',
      p_account_id, p_profile_id;
  end if;

  -- 2. Upgrade (or create) the subscription row for this profile.
  insert into public.subscriptions (user_id, tier, status, analyses_used_this_month, month_reset_date)
  values (
    p_profile_id,
    'silver',
    'active',
    0,
    (now() + interval '30 days')::timestamptz
  )
  on conflict (user_id) do update
     set tier                    = 'silver',
         status                  = 'active',
         analyses_used_this_month = 0,
         month_reset_date        = (now() + interval '30 days')::timestamptz;
end;
$$;

revoke execute on function public.complete_silver_purchase(uuid, uuid, int) from public;
grant  execute on function public.complete_silver_purchase(uuid, uuid, int) to authenticated;
