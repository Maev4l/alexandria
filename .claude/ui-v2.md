# Alexandria Front-End v2

## Technical requirements

- PWA (Progressive Web App) based on React
- Leverage shadcn/ui
- Use vite
- Based on yarn workspace
- Deployed on AWS via a CloudFormation template (`infra.yaml`)

## Tech stack

| Lib | Version |
|---|---|
| React | 19.1.0 |
| Vite | 6.3.5 |
| Tailwind CSS | 4.1.18 |
| vite-plugin-pwa | 1.2.0 |
| class-variance-authority | 0.7.1 |
| clsx | 2.1.1 |
| tailwind-merge | 2.6.0 |
| lucide-react | 0.469.0 |

## Project structure

```
packages/web-client-v2/
├── index.html
├── package.json
├── vite.config.js          # Vite + React + Tailwind + PWA plugins, "@" alias
├── jsconfig.json           # Path alias for "@/*" -> "./src/*"
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx            # Entry point
    ├── App.jsx             # Root component
    ├── index.css           # Tailwind + shadcn/ui CSS variables (light/dark)
    ├── components/ui/      # shadcn/ui components (to be added)
    ├── lib/utils.js        # cn() utility (clsx + tailwind-merge)
    └── assets/
```

## Progress

- [x] Scaffold: Vite + React + PWA + Tailwind CSS + shadcn/ui foundation
- [ ] Routing setup
- [ ] Authentication (AWS Cognito)
- [ ] Core pages and layouts
