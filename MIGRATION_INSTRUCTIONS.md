# Instructions de Migration pour les Noms Structurés

## Problème
Les colonnes de noms structurés (title, first_name, last_name, profile_image_url, stripe_customer_id, stripe_subscription_id) n'existent pas encore dans la table `users` de Supabase.

## Solution
Exécutez les commandes SQL suivantes dans l'interface Supabase SQL Editor :

```sql
-- Ajouter les colonnes de noms structurés
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR;

-- Peupler les champs structurés à partir des données existantes
-- Pour les médecins : parser depuis l'email (ex: sarah.miller@doktu.com -> Dr. Sarah Miller)
UPDATE users 
SET 
  title = 'Dr.',
  first_name = CASE 
    WHEN email LIKE '%@doktu.com' THEN 
      INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 1))
    ELSE NULL
  END,
  last_name = CASE 
    WHEN email LIKE '%@doktu.com' THEN 
      INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 2))
    ELSE NULL
  END
WHERE role = 'doctor' 
  AND email LIKE '%@doktu.com'
  AND (first_name IS NULL OR last_name IS NULL);

-- Pour les autres utilisateurs : parser depuis le username
UPDATE users 
SET 
  first_name = CASE 
    WHEN username LIKE '%.%' THEN 
      INITCAP(SPLIT_PART(username, '.', 1))
    WHEN username NOT LIKE '%.%' THEN 
      INITCAP(username)
    ELSE first_name
  END,
  last_name = CASE 
    WHEN username LIKE '%.%' THEN 
      INITCAP(SPLIT_PART(username, '.', 2))
    ELSE last_name
  END
WHERE role != 'doctor' 
  AND (first_name IS NULL OR last_name IS NULL);

-- Vérifier les résultats
SELECT 
  id,
  username,
  email,
  role,
  title,
  first_name,
  last_name,
  CONCAT(COALESCE(title || ' ', ''), COALESCE(first_name, ''), COALESCE(' ' || last_name, '')) AS formatted_name
FROM users 
WHERE role = 'doctor'
LIMIT 5;
```

## Après la Migration
1. Les champs structurés seront disponibles dans la table `users`
2. L'API doctors fonctionnera avec les nouveaux champs
3. Les composants DoctorCard et Home utiliseront les fonctions de noms structurés
4. Les noms seront affichés de manière cohérente : "Dr. Sarah Miller" au lieu de "Dr. sarah.miller"

## Vérification
Après avoir exécuté la migration, l'application devrait afficher les noms des médecins correctement formatés avec les titres et la capitalisation appropriés.