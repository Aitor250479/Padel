# Torneo de pádel

Web para organizar un torneo de pádel en el que las parejas marcan su disponibilidad cada
semana y un organizador lanza los emparejamientos.

Hecha con [Next.js](https://nextjs.org) y [Supabase](https://supabase.com) (base de datos y
login), y publicada en [Vercel](https://vercel.com). Los tres tienen plan gratuito suficiente
para el torneo.

## Estado

- [x] Paso 1: login por email, perfiles, parejas y rol de organizador
- [x] Paso 2: disponibilidad semanal
- [ ] Paso 3: emparejamientos
- [ ] Paso 4: resultados y clasificación

## Puesta en marcha (una sola vez)

### 1. Supabase

1. Crea un proyecto nuevo en [supabase.com](https://supabase.com/dashboard). Región: la más
   cercana (por ejemplo, Frankfurt o Londres).
2. Ve a **SQL Editor** y ejecuta, en orden, cada archivo de
   [`supabase/migrations`](supabase/migrations): pega su contenido y pulsa **Run**.
   Cuando se añada un archivo nuevo en una actualización, ejecuta solo ese.
3. Ve a **Project Settings → API** y copia la **Project URL** y la clave **anon public**.

### 2. Vercel

1. En [vercel.com](https://vercel.com/new) importa este repositorio de GitHub.
2. Antes de pulsar **Deploy**, en **Environment Variables** añade:
   - `NEXT_PUBLIC_SUPABASE_URL` = la Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la clave anon public
3. Pulsa **Deploy** y apunta la dirección que te da (por ejemplo
   `https://padel-xxxx.vercel.app`).

### 3. Conectar Supabase con la web

En Supabase, **Authentication → URL Configuration**:

- **Site URL**: la dirección de Vercel.
- **Redirect URLs**: añade `https://TU-DIRECCION.vercel.app/auth/callback`.

### 4. Primer acceso

Entra en la web con tu email. **La primera persona que entra queda como organizadora.**
Después pasa la dirección al resto de jugadores. Cuando hayan entrado, desde **Parejas** creas
las parejas y asignas a cada jugador. Desde ahí también puedes hacer organizador a otra persona.

> El servidor de correo gratuito de Supabase envía pocos emails por hora. Si en el primer día
> entra mucha gente a la vez y algún enlace no llega, que lo pida de nuevo un rato después. Si
> se queda corto, se puede configurar un servidor SMTP propio en Supabase.

## Desarrollo local

```bash
cp .env.example .env.local   # y rellena las dos claves
npm install
npm run dev
```

Añade `http://localhost:3000/auth/callback` a las Redirect URLs de Supabase para poder entrar en
local.
