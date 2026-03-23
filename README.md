# PlanetForge AI

A browser-based game where you create, shape, and evolve planets. Playable on desktop and mobile (iPad/iPhone).

## Play

Open `index.html` in a browser, or serve locally:

```bash
npx serve .
```

On iOS, add to Home Screen for a fullscreen app-like experience.

## Tech Stack

- Vanilla JavaScript (ES modules)
- HTML5 Canvas for rendering
- Responsive design with mobile/touch support
- No build step required

## Project Structure

```
planetforge-ai/
├── index.html        # Entry point
├── css/
│   └── style.css     # Responsive styles with safe-area support
├── js/
│   ├── main.js       # Bootstrap and resize handling
│   ├── game.js       # Game loop and rendering
│   ├── planet.js     # Planet entity
│   └── input.js      # Touch and mouse input handling
└── README.md
```

## Development

No dependencies or build tools needed. Edit the files and refresh the browser.

For live reload during development:

```bash
npx browser-sync start --server --files "**/*"
```

## License

MIT
