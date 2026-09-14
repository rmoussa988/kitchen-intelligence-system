-- After you create your login under Authentication → Users, run this ONCE to link
-- that email to the owner profile (U-01). Replace the email with the one you used.
update profiles
   set auth_uid = (select id from auth.users where email = 'YOUR_EMAIL_HERE')
 where id = 'U-01';

-- Verify it linked (should return one row with your email):
select p.id, p.name, p.role, u.email
  from profiles p join auth.users u on u.id = p.auth_uid
 where p.id = 'U-01';
