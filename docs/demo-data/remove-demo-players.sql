-- Supabase SQL editor: undo demo players (up to 30 users; cascading child rows).
BEGIN;
DELETE FROM users WHERE username IN ('PixelRook', 'NeonBadger', 'OrbitFox', 'QuietClutch', 'MangoStrafe', 'LunarDash', 'CopperAim', 'GhostCircuit', 'VelvetViper', 'FrostByte', 'TinyTitan', 'EchoPebble', 'TurboFern', 'NovaNoodle', 'AmberArc', 'CloudCrit', 'StaticOtter', 'CobaltCrow', 'MintMirage', 'RapidRaven', 'DuskDrifter', 'JellyJolt', 'SolarSparrow', 'LuckyLag', 'PrismPanda', 'RustyReflex', 'CometCrab', 'SilverSprout', 'WaffleWizard', 'ZenithZip') AND role = 'player';
COMMIT;
