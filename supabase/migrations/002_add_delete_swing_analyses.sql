-- Allow users to delete their own swing analyses
create policy "Users can delete own analyses"
  on public.swing_analyses for delete using (auth.uid() = user_id);

grant delete on public.swing_analyses to authenticated;
