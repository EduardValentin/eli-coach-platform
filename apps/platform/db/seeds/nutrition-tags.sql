INSERT INTO app.nutrition_tags (id, family, label, display_order)
VALUES
  ('mt-breakfast', 'meal-time', 'Breakfast', 1),
  ('mt-lunch', 'meal-time', 'Lunch', 2),
  ('mt-dinner', 'meal-time', 'Dinner', 3),
  ('mt-snack', 'meal-time', 'Snack', 4),
  ('mt-pre-workout', 'meal-time', 'Pre-workout', 5),
  ('mt-post-workout', 'meal-time', 'Post-workout', 6),
  ('cp-menstrual', 'cycle-phase', 'Menstrual', 7),
  ('cp-follicular', 'cycle-phase', 'Follicular', 8),
  ('cp-ovulatory', 'cycle-phase', 'Ovulatory', 9),
  ('cp-luteal', 'cycle-phase', 'Luteal', 10),
  ('nu-iron', 'nutrient', 'Iron-rich', 11),
  ('nu-omega3', 'nutrient', 'Omega-3', 12),
  ('nu-magnesium', 'nutrient', 'Magnesium', 13),
  ('nu-anti-inflammatory', 'nutrient', 'Anti-inflammatory', 14),
  ('di-vegetarian', 'dietary', 'Vegetarian', 15),
  ('di-lactose-free', 'dietary', 'Lactose-free', 16)
ON CONFLICT (id) DO NOTHING;
