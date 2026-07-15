-- Portal Permainan Nusantara v1.1 RC
-- Reference seed yang aman dijalankan berulang setelah migration 001_portal_schema.sql.
-- File ini tidak membuat akun Auth dan tidak berisi secret.

begin;

insert into public.games (slug, title, description, launch_path, icon, subjects, status, max_score)
values
  ('gobak-sodor', 'Gobak Sodor Nusantara', 'Permainan strategi, gotong royong, dan soal adaptif.', 'games/gobak-sodor/game.html', '🏃', array['Campuran','Budaya'], 'active', 10000),
  ('jelajah-nusantara', 'Jelajah Nusantara', 'Kuis budaya dan geografi dengan tugas terverifikasi server.', 'games/jelajah-nusantara/index.html', '🧭', array['IPS','Budaya','Geografi'], 'active', 12000),
  ('congklak-cerdas', 'Congklak Cerdas', 'Roadmap permainan berhitung dan strategi.', 'games.html', '🫘', array['Matematika'], 'coming_soon', 10000),
  ('engklek-pintar', 'Engklek Pintar', 'Roadmap permainan koordinasi dan soal pelajaran.', 'games.html', '🟨', array['Campuran'], 'coming_soon', 10000)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  launch_path = excluded.launch_path,
  icon = excluded.icon,
  subjects = excluded.subjects,
  max_score = excluded.max_score,
  updated_at = now();

insert into public.achievements (id, name, description, icon, xp_reward)
values
  ('first-session', 'Langkah Pertama', 'Selesaikan satu sesi permainan.', '🎮', 100),
  ('first-win', 'Juara Pertama', 'Menangkan satu ronde permainan.', '🏆', 200),
  ('quiz-ace', 'Cerdas Nusantara', 'Capai akurasi 90 persen atau lebih.', '🧠', 250),
  ('culture-explorer', 'Penjelajah Budaya', 'Mainkan dua game Nusantara yang berbeda.', '🧭', 300)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  xp_reward = excluded.xp_reward;

commit;
