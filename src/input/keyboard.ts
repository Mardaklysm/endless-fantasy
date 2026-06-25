import type { DirectionName, Vec } from "../scene/sceneTypes";

export function isUp(event: KeyboardEvent) {
  return event.code === "ArrowUp" || event.code === "KeyW" || event.key === "ArrowUp" || event.key.toLowerCase() === "w";
}

export function isDown(event: KeyboardEvent) {
  return event.code === "ArrowDown" || event.code === "KeyS" || event.key === "ArrowDown" || event.key.toLowerCase() === "s";
}

export function isLeft(event: KeyboardEvent) {
  return event.code === "ArrowLeft" || event.code === "KeyA" || event.key === "ArrowLeft" || event.key.toLowerCase() === "a";
}

export function isRight(event: KeyboardEvent) {
  return event.code === "ArrowRight" || event.code === "KeyD" || event.key === "ArrowRight" || event.key.toLowerCase() === "d";
}

export function isConfirm(event: KeyboardEvent) {
  return event.code === "Enter" || event.code === "Space" || event.code === "KeyZ" || event.key === "Enter" || event.key === " " || event.key.toLowerCase() === "z";
}

export function isCancel(event: KeyboardEvent) {
  return (
    event.code === "Escape" ||
    event.code === "Backspace" ||
    event.code === "KeyX" ||
    event.key === "Escape" ||
    event.key === "Backspace" ||
    event.key.toLowerCase() === "x"
  );
}

export function directionNameForEvent(event: KeyboardEvent): DirectionName | undefined {
  if (isUp(event)) return "up";
  if (isDown(event)) return "down";
  if (isLeft(event)) return "left";
  if (isRight(event)) return "right";
  return undefined;
}

export function keyDirection(event: KeyboardEvent): Vec | undefined {
  if (isUp(event)) return { x: 0, y: -1 };
  if (isDown(event)) return { x: 0, y: 1 };
  if (isLeft(event)) return { x: -1, y: 0 };
  if (isRight(event)) return { x: 1, y: 0 };
  return undefined;
}
