'use strict';

import trie from "./trie.js";
import words from "./words.js";

const gridSize = 32;
const start = { x: 5, y: 5 };

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

var target = words[Math.floor(Math.random() * words.length)];

let snake = [start];

// Snakes current letters
let letters = [{
	letter: '',
	type: 'start'
}];
let direction;
let nextDirection;

const BASE_MS_PER_MOVE = 200;

let msPerMove = BASE_MS_PER_MOVE;
let lastFrame = 0;

let letterStatus = {};

let foods = {};

var pattern;

function main() {
	var canvas = document.getElementById("wormle-board");
	var ctx = canvas.getContext('2d');

	genFood(canvas.width / gridSize, canvas.height / gridSize);

	createPattern();


	draw(msPerMove, ctx, canvas.width, canvas.height);
}

function createPattern() {
	var canvasPattern = document.createElement("canvas");
	canvasPattern.width = 10;
	canvasPattern.height = 10;
	var pctx = canvasPattern.getContext("2d");


	pctx.lineWidth = 2;
	pctx.beginPath();
	pctx.moveTo(0, 0);
	pctx.lineTo(10, 10);

	pctx.moveTo(0, -10);
	pctx.lineTo(20, 10);

	pctx.moveTo(-10, 0);
	pctx.lineTo(10, 20);
	pctx.stroke();

	pattern = pctx.createPattern(canvasPattern, "repeat");
}

document.addEventListener("keydown", handleInput);

function handleInput(event) {
	let key = event.keyCode;
	if (key == 37 && direction != "right") {
		nextDirection = "left";
	} else if (key == 38 && direction != "down") {
		nextDirection = "up";
	} else if (key == 39 && direction != "left") {
		nextDirection = "right";
	} else if (key == 40 && direction != "up") {
		nextDirection = "down";
	}
}

function genFood(width, height) {
	for (const letter of alphabet) {
		spawnFood(width, height, letter);
		letterStatus[letter] = "unknown";
	}
}

function spawnFood(width, height, letter) {
	var x, y;

	do {
		x = Math.floor(Math.random() * width);
		y = Math.floor(Math.random() * height);
	} while (!canSpawn(x, y));

	foods[toCoordKey(x, y)] = { letter: letter, x: x, y: y };
}

function canSpawn(x, y) {
	return !snake.some(piece => piece.x == x && piece.y == y) && foods[toCoordKey(x, y)] == null;
}

// Why do people use this language.
function toCoordKey(x, y) {
	return x + ',' + y;
}

function drawSquare(ctx, letter, type, x, y, size) {
	let offset = (gridSize - size) / 2;
	ctx.fillStyle = getColor(type);
	ctx.fillRect(x * gridSize + offset, y * gridSize + offset, gridSize - 2 * offset, gridSize - 2 * offset);
	ctx.strokeStyle = "rgb(135, 138, 140)";
	ctx.strokeRect(x * gridSize + offset, y * gridSize + offset, gridSize - 2 * offset, gridSize - 2 * offset);
	ctx.fillStyle = getTextColor(type);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = 'bold 16px sans-serif';
	ctx.fillText(letter, x * gridSize + gridSize / 2, y * gridSize + gridSize / 2);
}

function draw(ts, ctx, width, height) {
	const elapsed = ts - lastFrame;

	if (elapsed > msPerMove) {
		ctx.clearRect(0, 0, width, height);

		let curGuessLength = letters.length % target.length;

		for (let i = 0; i < snake.length; i++) {
			let piece = snake[i];
			let letter = letters[i];

			let squareSize = snake.length - i <= curGuessLength ? gridSize - 4 : gridSize;

			drawSquare(ctx, letter.letter, letter.type, piece.x, piece.y, squareSize);
		}


		for (let food of Object.values(foods)) {
			let letter = food.letter;
			ctx.fillStyle = getColor(letterStatus[food.letter]);

			ctx.strokeStyle = "rgb(135, 138, 140)";
			ctx.lineWidth = 1;

			ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
			ctx.strokeRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
			ctx.fillStyle = getTextColor(letterStatus[food.letter]);
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = 'bold 16px sans-serif';
			ctx.fillText(food.letter, food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2);

			if (!isLetterLegal(letter)) {
				ctx.lineWidth = 4;
				ctx.strokeStyle = "black";
				ctx.globalCompositeOperation = "multiply";
				ctx.fillStyle = pattern;
				ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
				ctx.strokeRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
			}

			ctx.globalCompositeOperation = "source-over";
		}

		ctx.lineWidth = 1;

		let snakeX = snake[0].x;
		let snakeY = snake[0].y;

		direction = nextDirection;

		switch (direction) {
			case "left":
				snakeX -= 1;
				break;
			case "right":
				snakeX += 1;
				break;
			case "up":
				snakeY -= 1;
				break;
			case "down":
				snakeY += 1;
				break;
		}

		if (direction && snake.some(piece => piece.x == snakeX && piece.y == snakeY)) {
			loseGame(ctx, width, height);
			return;
		}

		let eaten = foods[toCoordKey(snakeX, snakeY)];

		if (eaten) {
			if (!isLetterLegal(eaten.letter)) {
				loseGame(ctx, width, height);
				return;
			}

			if (getCurrentGuess() + eaten.letter == target) {
				winGame(ctx, width, height);
				return;
			}

			delete foods[toCoordKey(snakeX, snakeY)];

			// Replace starting block
			if (letters[0].letter == '') {
				snake.pop();
				letters.pop();
			}

			let status = checkLetter(letters.length % target.length, eaten.letter);

			if (letterStatus[eaten.letter] != "correct") {
				letterStatus[eaten.letter] = status;
			}

			letters.push({ letter: eaten.letter, type: status });

			spawnFood(width / gridSize, height / gridSize, eaten.letter);

			let numGuesses = Math.floor(letters.length / target.length);

			msPerMove = Math.max(BASE_MS_PER_MOVE - (30 - Math.pow(.9, numGuesses) * 30), 66);
		} else {
			snake.pop();
		}


		snake.unshift({ x: snakeX, y: snakeY });

		lastFrame = ts;
	}

	requestAnimationFrame((ts) => {
		draw(ts, ctx, width, height)
	});
}

function loseGame(ctx, width, height) {
	ctx.fillStyle = "black";
	ctx.font = 'bold 64px sans-serif';
	ctx.fillText("You Lose!", width / 2, height / 2);
}

function winGame(ctx, width, height) {
	ctx.fillStyle = "black";
	ctx.font = 'bold 64px sans-serif';
	ctx.fillText("You Win!", width / 2, height / 2);
}

function getCurrentGuess() {
	let totalGuesses = Math.floor(letters.length / target.length);

	let guessedAlready = letters.length - (totalGuesses * target.length);


	var guess = "";

	for (let i = 0; i < guessedAlready; i++) {
		guess = letters[letters.length - (i + 1)].letter + guess;
	}

	return guess;
}

function isLetterLegal(letter) {

	let guess = getCurrentGuess();


	var curTrie = trie;

	for (const guessed of guess) {
		curTrie = curTrie[guessed];

		if (!curTrie) {
			break;
		}
	}

	return curTrie && curTrie[letter];
}

function checkLetter(index, letter) {
	if (target.charAt(index) == letter) {
		return "correct";
	}

	if (target.includes(letter)) {
		return "close";
	}

	return "wrong";
}

function getColor(status) {
	switch (status) {
		case "correct":
			return "rgb(106, 170, 100)";
		case "close":
			return "rgb(201, 180, 88)";
		case "wrong":
			return "rgb(120, 124, 126)";
		case "start":
			return "white";
		default:
			return "rgb(211, 214, 218)";
	}
}

function getTextColor(status) {
	switch (status) {
		case "unknown":
			return "black";
		default:
			return "white";
	}
}


window.addEventListener('load', main);