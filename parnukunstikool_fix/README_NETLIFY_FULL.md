# Netlify täisversioon

See pakk ei kasuta enam Lovable'i editorit eraldi lingina. Avalik sait ja `/edit` editor töötavad sama Netlify domeeni all.

## Netlify seaded

Build command:

```text
npm run build
```

Publish directory:

```text
dist
```

Need seaded on failis `netlify.toml` juba olemas.

## Keskkonnamuutujad Netlifys

Lisa Netlify projektis järgmised muutujad:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` peab olema ainult Netlifys, mitte GitHubis.

## Editor

Editor avaneb:

```text
/edit
```

Näiteks:

```text
https://kunstikooligalerii.netlify.app/edit
```

## Märkus

Sait on Lovable'ist sõltumatu. Andmebaas ja pildid on endiselt Supabase'is, sest Netlify staatiline majutus ei salvesta ise andmeid ega pilte püsivalt.
