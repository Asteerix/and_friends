-- Ajout du champ location_permission_granted à la table profiles
ALTER TABLE profiles
ADD COLUMN location_permission_granted boolean DEFAULT false;

-- Création de la table phone_contacts pour stocker les contacts du téléphone
CREATE TABLE phone_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    phone_number text,
    email text,
    first_name text,
    last_name text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index pour accélérer les recherches par user_id
CREATE INDEX idx_phone_contacts_user_id ON phone_contacts(user_id);
