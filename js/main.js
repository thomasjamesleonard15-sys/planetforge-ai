import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');
const titleScreen = document.getElementById('title-screen');

const game = new Game(canvas);

// Hide HTML title — intro cutscene replaces it
titleScreen.style.display = 'none';
canvas.focus();

function resize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  game.resize(canvas.width, canvas.height);
}

window.addEventListener('resize', resize);
resize();
game.start();
