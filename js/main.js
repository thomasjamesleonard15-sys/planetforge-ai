import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');
const btnStart = document.getElementById('btn-start');
const titleScreen = document.getElementById('title-screen');

const game = new Game(canvas);

btnStart.addEventListener('click', () => {
  titleScreen.style.display = 'none';
  canvas.focus();
  game.start();
});

function resize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  game.resize(canvas.width, canvas.height);
}

window.addEventListener('resize', resize);
resize();
