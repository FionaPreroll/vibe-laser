import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { centerOf } from '../e2e/board'

type Step =
  | { piece: number; pos: string; rot: number }
  | { from: string; pos: string; rot: number }
  | { wait: number }
  | { stow: string }

interface Level {
  objects: { pos: string; rot?: number }[]
  toolbox: { rot?: number; count?: number }[]
  solution?: Step[]
}

/** A cell name such as "B6" as [column, row] from 0: the letter is the row, the number the column. */
function cellOf(name: string): [number, number] {
  return [Number(name.slice(1)) - 1, name.charCodeAt(0) - 'A'.charCodeAt(0)]
}

/** The level file of a built-in level, such as "sea-of-colors/1/6". */
export function levelFile(level: string): Level {
  const [pack, skill, number] = level.split('/')
  const file = `packs/${pack}/levels/skill${skill}/level_${String(number).padStart(3, '0')}.json`
  return JSON.parse(readFileSync(file, 'utf8')) as Level
}

/**
 * Plays the first `count` moves of a level's known solution with the mouse: drags each piece to
 * its cell and clicks it round to its rotation. With `hold`, the next piece is left hanging over
 * its cell, so the beams preview where its light would go.
 */
export async function playSolution(
  page: Page,
  level: string,
  { count, hold = false }: { count?: number; hold?: boolean } = {},
) {
  const file = levelFile(level)
  const rotations = file.toolbox.flatMap((part) =>
    Array.from({ length: part.count ?? 1 }, () => part.rot ?? 0),
  )
  const steps = (file.solution ?? []).filter((step) => 'pos' in step && 'piece' in step)
  const played = steps.slice(0, count ?? steps.length)
  for (const step of played) {
    const from = await centerOf(page, { slot: step.piece })
    const to = await centerOf(page, { cell: cellOf(step.pos) })
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 8 })
    await page.mouse.up()
    const turn = (((step.rot - (rotations[step.piece] ?? 0)) % 8) + 8) % 8
    const [button, times] = turn > 4 ? (['left', 8 - turn] as const) : (['right', turn] as const)
    for (let click = 0; click < times; click++) await page.mouse.click(to.x, to.y, { button })
  }
  const next = steps[played.length]
  if (hold && next !== undefined) {
    const from = await centerOf(page, { slot: next.piece })
    const to = await centerOf(page, { cell: cellOf(next.pos) })
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 8 })
  }
}
