-- Syre: perfil 'demo' para a conta de demonstração (somente leitura), usada por recrutadores.
-- Idempotente, como as demais migrações (reaplicada a cada execução, depois da 003).
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_chk;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_perfil_chk CHECK (perfil IN ('admin', 'operador', 'demo'));
