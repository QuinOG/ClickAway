-- Each round token can pay out once. The server records the token's round id
-- here in the same transaction that writes the round's rewards, so a resubmitted
-- round is refused. Rows older than two days are pruned at startup (tokens
-- expire after an hour).
create table if not exists consumed_round_tokens (
  token_id varchar(64) not null,
  user_id bigint not null,
  consumed_at timestamptz not null default now(),
  primary key (token_id),
  constraint fk_consumed_round_tokens_user
    foreign key (user_id) references users (id) on delete cascade
);

create index if not exists idx_consumed_round_tokens_user on consumed_round_tokens (user_id);

do $grant$
begin
  if exists (select 1 from pg_roles where rolname = 'clickaway_app') then
    grant select, insert, update, delete on consumed_round_tokens to clickaway_app;
  end if;
end
$grant$;
