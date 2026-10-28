import { describe, expect, it } from 'vitest'
import { History } from './history'

describe('History', () => {
  it('undoes and redoes whole values', () => {
    const history = new History('a')
    history.push('b')
    history.push('c')
    expect(history.undo()).toBe(true)
    expect(history.current.value).toBe('b')
    expect(history.canRedo.value).toBe(true)
    expect(history.redo()).toBe(true)
    expect(history.current.value).toBe('c')
    expect(history.redo()).toBe(false)
  })

  it('forgets the future after a new value and ignores the same value', () => {
    const history = new History(1)
    history.push(2)
    history.undo()
    history.push(3)
    expect(history.canRedo.value).toBe(false)
    history.push(3)
    history.undo()
    expect(history.current.value).toBe(1)
    expect(history.undo()).toBe(false)
  })

  it('keeps only so many steps', () => {
    const history = new History(0, 2)
    for (const value of [1, 2, 3]) history.push(value)
    expect(history.undo() && history.undo()).toBe(true)
    expect(history.undo()).toBe(false)
    expect(history.current.value).toBe(1)
  })

  it('amends the current value without a step of its own', () => {
    const history = new History('a')
    history.push('b')
    history.amend('bb')
    expect(history.current.value).toBe('bb')
    history.undo()
    expect(history.current.value).toBe('a')
  })
})
