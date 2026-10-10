INSERT INTO app.product_types (slug, display_label, display_order)
VALUES
  ('workouts', 'Workouts', 1),
  ('nutrition-plans', 'Nutrition Plans', 2),
  ('e-books', 'E-Books', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO app.product_goals (slug, display_label, display_order)
VALUES
  ('muscle-building', 'Muscle Building', 1),
  ('fat-loss', 'Fat Loss', 2),
  ('wellness', 'Wellness', 3),
  ('hormonal-balance', 'Hormonal Balance', 4)
ON CONFLICT (slug) DO NOTHING;
