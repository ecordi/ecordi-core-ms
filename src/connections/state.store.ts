import { Injectable } from '@nestjs/common'

@Injectable()
export class StateStore {
  private map = new Map<string, number>()
  private ttlMs = 10 * 60 * 1000

  set(state: string) {
    this.map.set(state, Date.now() + this.ttlMs)
  }

  consumeIfValid(state: string) {
    const exp = this.map.get(state)
    if (!exp) return false
    if (Date.now() > exp) {
      this.map.delete(state)
      return false
    }
    this.map.delete(state)
    return true
  }
}
