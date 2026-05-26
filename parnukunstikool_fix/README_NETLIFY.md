# Netlify avaldamine

See pakk on muudetud nii, et Netlify ehitaks staatilise avaliku saidi kausta `dist`.

Netlify seaded:

```text
Build command: npm run build:static
Publish directory: dist
Node version: 22
```

Need seaded on juba failis `netlify.toml`, seega GitHubi kaudu importides peaks Netlify need ise lugema.

Oluline:

- Staatiline build loob avaliku galerii, kategoorialehed, tekstilehed ja tunniplaani.
- `/edit` adminiosa selles staatilises Netlify variandis täisfunktsionaalselt ei tööta.
- Kui Supabase’is andmeid muudad, tee Netlifys uus deploy.
- Ära pane `SUPABASE_SERVICE_ROLE_KEY` väärtust GitHubi ega `VITE_` prefiksiga muutujaks.
