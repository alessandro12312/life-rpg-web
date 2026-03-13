-- Sincronizzazione manuale degli utenti orfani
-- Esegui questo script nell'SQL Editor di Supabase

-- 1. Inserisci gli utenti da auth.users a public.users che mancano
INSERT INTO public.users (id, email, username)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 2. Inserisci le statistiche per gli utenti che non le hanno
INSERT INTO public.character_stats (user_id)
SELECT id 
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.character_stats)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Aggiorniamo il trigger con gestione degli errori (in caso di username duplicati o altro)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(md5(random()::text), 1, 4))
  );
  
  INSERT INTO public.character_stats (user_id)
  VALUES (new.id);
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Ignora eventuali errori (es. username duplicati) per non bloccare l'autenticazione, 
    -- ma la riga non verrà inserita se c'è un errore fatale lato DB.
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
