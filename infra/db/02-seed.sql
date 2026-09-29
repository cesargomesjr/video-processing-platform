-- Seed de desenvolvimento local.
--
-- Usuário demo:
--   email: demo@fiapx.com
--   senha: Str0ngPass1
INSERT INTO users (email, password_hash)
VALUES ('demo@fiapx.com', '$2b$10$2vsWvp7s.KaOu7X/NsgpkOWS7HAPBc73udDZGsmTL.B5flF0W0ai6')
ON CONFLICT (email) DO NOTHING;
