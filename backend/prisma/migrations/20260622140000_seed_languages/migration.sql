INSERT INTO "languages" ("name")
VALUES
  ('English'),
  ('Russian'),
  ('Ukrainian'),
  ('German'),
  ('French'),
  ('Spanish'),
  ('Portuguese'),
  ('Polish'),
  ('Italian'),
  ('Turkish'),
  ('Chinese'),
  ('Japanese'),
  ('Korean'),
  ('Arabic')
ON CONFLICT ("name") DO NOTHING;
