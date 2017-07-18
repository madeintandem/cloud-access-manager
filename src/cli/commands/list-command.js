// @flow
import { manager } from './../../core/service-providers/manager'
import { terminal as term } from 'terminal-kit'
import * as helpers from '../helpers'

export async function listAll () {
  const summaries = await manager.download('all')
  helpers.printSummaries(summaries)
}

export async function listByService (serviceId: string) {
  if (!manager.isConfigured(serviceId)) {
    term.red(`Service '${serviceId}' is not configured. Run 'cam config ${serviceId}'\n`)
    return
  }

  const summaries = await manager.download(serviceId)
  helpers.printSummaries(summaries, false)
}