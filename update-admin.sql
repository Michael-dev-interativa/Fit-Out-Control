-- Execute este SQL no pgAdmin para atualizar o admin com senha correta

-- Primeiro, deleta o admin antigo se existir
DELETE FROM public.usuarios WHERE email = 'admin@fitout.com';

-- Cria o admin com hash correto
INSERT INTO public.usuarios (email, nome, password_hash, role, perfil_cliente)
VALUES (
    'admin@fitout.com',
    'Administrador',
    '29e90dc832cfa00a80ba4265fb999182:85ce483496460f289d20d750bb2503756598b1322e4f610e530defd5eaa845b6',
    'admin',
    false
);

-- Verificar se foi criado
SELECT id, email, nome, role FROM public.usuarios WHERE email = 'admin@fitout.com';
