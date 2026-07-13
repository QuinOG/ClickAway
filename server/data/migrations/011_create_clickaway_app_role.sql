do $role$
begin
  if not exists (select 1 from pg_roles where rolname = 'clickaway_app') then
    create role clickaway_app
      nologin
      nosuperuser
      nocreatedb
      nocreaterole
      noinherit;
  end if;
end
$role$;

alter role clickaway_app bypassrls;
alter role clickaway_app set search_path to public, pg_catalog;

grant connect on database postgres to clickaway_app;
grant usage on schema public to clickaway_app;
grant select, insert, update, delete on all tables in schema public to clickaway_app;
grant usage, select, update on all sequences in schema public to clickaway_app;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to clickaway_app;
alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to clickaway_app;
