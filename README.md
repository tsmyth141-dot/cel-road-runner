# Graffiti Grove

Create a lightweight browser-based 3D first-person action game.

IMPORTANT:

The game must run in a normal Chrome browser on a Chromebook.

Do not require downloads or a desktop application.

Keep performance lightweight because the target device is a Chromebook.

Use JavaScript and Three.js/WebGL for the 3D game.

Keep the project free/open-source where possible.

Do not use copyrighted assets from existing games.

GAMEPLAY:

First-person perspective.

The player can walk around a 3D environment.

Mouse controls looking around.

Keyboard controls movement.

The player will eventually have both a firearm and a sword.

We will add enemies, combat, missions, dialogue and bosses later.

VISUAL STYLE:
Create an original stylised cel-shaded visual style inspired by early-2000s cel-shaded games and graffiti/street-art aesthetics.

Bold outlines

Flat/cartoon-like shading

Strong colours

Stylised environments

Low-to-medium polygon count

Avoid realistic graphics because performance on Chromebook is important.

STORY:
This will eventually be a lengthy single-player story-driven game with multiple chapters, characters, missions, dialogue and potentially multiple endings.
Do not create the entire story yet. Build the technical foundation first.

SAVE SYSTEM:
The finished game must support saving and loading progress in the browser.
Use browser local storage or another lightweight client-side solution so the player can close the browser and continue later.

FIRST TASK:
For now, create only a basic playable first-person 3D test environment:

A floor.

Several walls.

First-person camera.

WASD movement.

Mouse-look.

A simple stylised/cel-shaded rendering setup.

A simple crosshair.

A basic main menu with "New Game" and "Continue".

Do not add complicated features yet. Make sure the basic 3D environment actually runs smoothly in Chrome before adding anything else.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/03d9154f-730e-453a-9b6a-ff287184e641).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
