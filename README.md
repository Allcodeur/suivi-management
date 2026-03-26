# ⚡ WorkloadIQ

> Outil de suivi de charge d'équipe — Sprint planning, Matrice Eisenhower, Analytics de vélocité.  
> Stack : **Next.js 14 · Supabase · Resend · Vercel**

---

## 🚀 Déploiement en 5 étapes

### 1. Supabase — Base de données

1. Créez un compte sur [supabase.com](https://supabase.com) et créez un nouveau projet
2. Dans **SQL Editor**, copiez et exécutez le contenu de `supabase/migrations/001_initial_schema.sql`
3. Récupérez vos clés dans **Settings > API** :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Resend — Emails de notification

1. Créez un compte sur [resend.com](https://resend.com)
2. Ajoutez et vérifiez votre domaine
3. Créez une clé API → `RESEND_API_KEY`

### 3. Variables d'environnement

Copiez `.env.example` en `.env.local` et remplissez :

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

RESEND_API_KEY=re_...
NOTIFICATION_FROM_EMAIL=noreply@votre-domaine.com
MANAGER_EMAIL=manager@votre-entreprise.com

NEXT_PUBLIC_APP_URL=https://votre-app.vercel.app
CRON_SECRET=un_secret_aleatoire_fort
```

### 4. Déploiement Vercel

```bash
# Option A : via CLI
npm i -g vercel
vercel --prod

# Option B : via GitHub
# 1. Push ce repo sur GitHub
# 2. Connectez-le sur vercel.com
# 3. Ajoutez les variables d'env dans Settings > Environment Variables
# 4. Deploy !
```

### 5. Création des comptes utilisateurs

#### Compte Collaborateur
→ Le collaborateur s'inscrit directement sur `/login`

#### Compte Manager
1. Le manager s'inscrit sur `/login`
2. Dans Supabase **Table Editor > profiles**, changez son `role` de `colleague` à `manager`

```sql
-- Ou via SQL Editor :
UPDATE public.profiles SET role = 'manager' WHERE email = 'manager@votre-entreprise.com';
```

---

## 📋 Fonctionnalités

### Vue Collaborateur
- **Sprint Planning** : créer des sprints de 2 semaines, ajouter des tâches, ajuster la capacité
- **Matrice Eisenhower** : glisser-déposer les tâches entre quadrants (Q1→Q4)
- **Dashboard** : jauge de saturation, alertes sur/sous-charge en temps réel

### Vue Manager
- Voir tous les sprints actifs de l'équipe
- Analytics de vélocité historique
- Réception des emails d'alerte

### Notifications automatiques
| Événement | Déclencheur | Destinataires |
|-----------|-------------|---------------|
| Surcharge | Sprint > 110% capacité | Manager + Collaborateur |
| Sous-charge | Sprint < 75% capacité | Manager + Collaborateur |
| Bilan sprint | Lundi 8h (cron) | Manager + Collaborateur |

> Anti-spam : max 1 email par type par sprint par heure

---

## 🏗 Architecture

```
src/
├── app/
│   ├── (app)/                    # Pages protégées (auth required)
│   │   ├── layout.tsx            # Sidebar + auth check
│   │   ├── dashboard/            # Vue globale + KPIs
│   │   ├── sprint/               # Sprint planning + task management
│   │   ├── eisenhower/           # Matrice drag & drop
│   │   └── analytics/            # Graphiques vélocité + Pareto
│   ├── api/
│   │   ├── sprints/route.ts      # CRUD sprints
│   │   ├── tasks/route.ts        # CRUD tâches + détection charge
│   │   └── notifications/route.ts # Envoi emails Resend
│   ├── auth/callback/route.ts    # OAuth callback
│   └── login/page.tsx            # Auth page
├── components/
│   └── ui/                       # Card, Badge, Gauge, Sidebar...
├── lib/
│   ├── supabase/                 # Client browser + server
│   └── notifications.ts          # Templates email Resend
├── types/index.ts                # Types + constantes métier
└── middleware.ts                 # Route protection
supabase/
└── migrations/001_initial_schema.sql
vercel.json                       # Cron config (lundi 8h)
```

---

## 🔧 Développement local

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## 📊 Seuils de charge configurables

Dans `src/types/index.ts` :

```typescript
export const LOAD_THRESHOLDS = {
  UNDERLOAD: 0.75,    // < 75% → Sous-chargé (alerte orange)
  OPTIMAL_MAX: 1.10,  // 75–110% → Optimal (vert)
  OVERLOAD: 1.10,     // > 110% → Surchargé (alerte rouge)
}
```

---

## 🛡 Sécurité

- **Row Level Security (RLS)** activé sur toutes les tables Supabase
- Les collaborateurs ne voient que leurs propres données
- Les managers voient tout
- JWT vérifié côté serveur à chaque requête API
- Middleware Next.js protège toutes les routes `/dashboard`, `/sprint`, etc.

---

*Généré avec WorkloadIQ — Anthropic Claude*
