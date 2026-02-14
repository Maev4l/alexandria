# Alexandria Front-End v2

## Technical requirements

- PWA (Progressive Web App) based on React
- Leverage shadcn/ui
- Use vite
- Based on yarn workspace
- Deployed on AWS via a CloudFormation template (`infra.yaml`)

## Development guidelines
- Naming:
    - Extensions: Use .jsx extension for React components.
    - Filename: Use PascalCase for filenames. E.g., ReservationCard.jsx.
    - Reference Naming: Use PascalCase for React components and camelCase for their instances.
    - Component Naming: Use the filename as the component name. For example, ReservationCard.jsx should have a reference name of ReservationCard. However, for root components of a directory, use index.jsx as the filename and use the directory name as the component name.
    - Props Naming: Avoid using DOM component prop names for different purposes.
- Always use double quotes (") for JSX attributes, but single quotes (') for all other JS

## Pitfalls
- The user id, comes from the 'sub' claim in the JWT returned by Cognito, where the dashes are removed and the final value capitalized

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
| aws-amplify | 6.16.2 |
| react-router-dom | 7.13.0 |

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
    ├── main.jsx            # Entry point, Amplify init
    ├── App.jsx             # Root component, routing + auth
    ├── config.js           # Cognito & API config from output.json
    ├── index.css           # Tailwind + shadcn/ui CSS variables (light/dark)
    ├── auth/
    │   └── AuthContext.jsx # AuthProvider, useAuth hook (Cognito)
    ├── pages/
    │   ├── Login.jsx       # Login form
    │   └── Home.jsx        # Placeholder home page
    ├── components/ui/      # shadcn/ui components
    │   ├── Button.jsx
    │   ├── Card.jsx
    │   ├── Input.jsx
    │   └── Label.jsx
    ├── lib/utils.js        # cn() utility (clsx + tailwind-merge)
    └── assets/
```

## Progress

- [x] Scaffold: Vite + React + PWA + Tailwind CSS + shadcn/ui foundation
- [x] Routing setup (react-router-dom, protected/public routes)
- [x] Authentication (AWS Cognito via aws-amplify, login form, auth context)
- [ ] Core pages and layouts
